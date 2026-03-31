import { BadRequestException, HttpException } from '@nestjs/common'
import type { Repository } from 'typeorm'

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}))

describe('EmailService external tests', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns simulated status outside smtp mode', async () => {
    const { EmailSendStatus } = require('../../../backend/src/auth/email-verification.entity')
    const infoSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    process.env.EMAIL_MODE = 'console'
    const { EmailService } = require('../../../backend/src/email/email.service')

    const service = new EmailService()
    await expect(
      service.sendVerificationCode({ to: 'user@bsm.com.mx', code: '123456', nombre: 'Alex' }),
    ).resolves.toEqual({ status: EmailSendStatus.Simulated })

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Codigo de verificacion simulado para user@bsm.com.mx'),
    )
  })

  it('warns when production uses non-smtp mode', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    process.env.NODE_ENV = 'production'
    process.env.EMAIL_MODE = 'console'
    const { EmailService } = require('../../../backend/src/email/email.service')

    new EmailService()

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('EMAIL_MODE no es smtp en produccion'),
    )
  })

  it('sends mail successfully in smtp mode', async () => {
    const { EmailSendStatus } = require('../../../backend/src/auth/email-verification.entity')
    process.env.EMAIL_MODE = 'smtp'
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '465'
    process.env.SMTP_USER = 'user'
    process.env.SMTP_PASS = 'pass'
    process.env.SMTP_FROM = 'noreply@example.com'

    const nodemailer = require('nodemailer').default as any
    const sendMail = jest.fn().mockResolvedValue(undefined)
    nodemailer.createTransport.mockReturnValue({ sendMail })
    const { EmailService } = require('../../../backend/src/email/email.service')

    const service = new EmailService()
    await expect(
      service.sendVerificationCode({ to: 'user@bsm.com.mx', code: '654321', nombre: 'Alex' }),
    ).resolves.toEqual({ status: EmailSendStatus.Sent })

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: 'user@bsm.com.mx',
        subject: 'Codigo de verificacion DMS',
      }),
    )
  })

  it('returns failed status when smtp throws', async () => {
    const { EmailSendStatus } = require('../../../backend/src/auth/email-verification.entity')
    process.env.EMAIL_MODE = 'smtp'
    process.env.SMTP_HOST = 'smtp.example.com'

    const nodemailer = require('nodemailer').default as any
    nodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockRejectedValue(new Error('smtp failed')),
    })
    const { EmailService } = require('../../../backend/src/email/email.service')

    const service = new EmailService()
    await expect(
      service.sendVerificationCode({ to: 'user@bsm.com.mx', code: '111111' }),
    ).resolves.toEqual({
      status: EmailSendStatus.Failed,
      error: 'smtp failed',
    })
  })
})

describe('VerificationService external tests', () => {
  const makeRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  }) as unknown as jest.Mocked<Repository<any>>

  const user = {
    id: 15,
    email: 'user@bsm.com.mx',
    nombre: 'Alex',
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates and refreshes verification records', async () => {
    const { EmailSendStatus } = require('../../../backend/src/auth/email-verification.entity')
    const { VerificationService } = require('../../../backend/src/auth/verification.service')
    const repo = makeRepo()
    const emailService = { sendVerificationCode: jest.fn() } as any
    repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      user,
      codeHash: 'old',
      expiresAt: new Date('2026-01-01'),
      sendStatus: EmailSendStatus.Failed,
      sendAttempts: 2,
      verifyAttempts: 3,
      lastAttemptAt: new Date('2026-01-01'),
      lastAttemptIp: '127.0.0.1',
    })

    const service = new VerificationService(repo as any, emailService)
    const created = await service.createOrRefresh(user, '123456')
    const refreshed = await service.createOrRefresh(user, '654321')

    expect(created.sendStatus).toBe(EmailSendStatus.Pending)
    expect(created.verifyAttempts).toBe(0)
    expect(refreshed.sendStatus).toBe(EmailSendStatus.Pending)
    expect(refreshed.verifyAttempts).toBe(0)
    expect(refreshed.lastAttemptAt).toBeNull()
  })

  it('persists send result or throws when missing', async () => {
    const { EmailSendStatus } = require('../../../backend/src/auth/email-verification.entity')
    const { VerificationService } = require('../../../backend/src/auth/verification.service')
    const repo = makeRepo()
    const emailService = {
      sendVerificationCode: jest.fn().mockResolvedValue({ status: EmailSendStatus.Simulated }),
    } as any
    repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      user,
      sendAttempts: 0,
      sendStatus: EmailSendStatus.Pending,
      sentAt: null,
      lastError: null,
    })

    const service = new VerificationService(repo as any, emailService)
    await expect(service.sendCode(user, '123456')).rejects.toMatchObject({
      message: 'Registro de verificacion no encontrado',
    })
    await expect(service.sendCode(user, '123456')).resolves.toEqual({
      status: EmailSendStatus.Simulated,
    })
  })

  it('handles invalid, expired, exhausted and valid codes', async () => {
    const { VerificationService } = require('../../../backend/src/auth/verification.service')
    const repo = makeRepo()
    const emailService = { sendVerificationCode: jest.fn() } as any
    const bcrypt = require('bcrypt')
    const validHash = await bcrypt.hash('111111', 10)
    repo.findOne
      .mockResolvedValueOnce({
        user,
        verifyAttempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
        codeHash: validHash,
      })
      .mockResolvedValueOnce({
        user,
        verifyAttempts: 0,
        expiresAt: new Date(Date.now() - 60_000),
        codeHash: validHash,
      })
      .mockResolvedValueOnce({
        user,
        verifyAttempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
        codeHash: validHash,
        lastAttemptAt: null,
        lastAttemptIp: null,
      })
      .mockResolvedValueOnce({
        user,
        verifyAttempts: 4,
        expiresAt: new Date(Date.now() + 60_000),
        codeHash: validHash,
        lastAttemptAt: null,
        lastAttemptIp: null,
      })
      .mockResolvedValueOnce({
        user,
        verifyAttempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
        codeHash: validHash,
        lastAttemptAt: null,
        lastAttemptIp: null,
      })

    const service = new VerificationService(repo as any, emailService)
    await expect(service.verifyCode({ user, code: '111111' })).rejects.toMatchObject({
      message: 'Se excedio el numero de intentos. Solicita un nuevo codigo.',
      status: 429,
    })
    await expect(service.verifyCode({ user, code: '111111' })).rejects.toMatchObject({
      message: 'Codigo expirado',
    })
    await expect(service.verifyCode({ user, code: '222222', ip: '10.0.0.1' })).resolves.toBe(false)
    await expect(service.verifyCode({ user, code: '222222' })).rejects.toMatchObject({
      message: 'Se excedio el numero de intentos. Solicita un nuevo codigo.',
      status: 429,
    })
    await expect(service.verifyCode({ user, code: '111111' })).resolves.toBe(true)
  })
})
