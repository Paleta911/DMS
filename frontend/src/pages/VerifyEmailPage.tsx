import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  authResendVerificationCode,
  authVerificationStatus,
  authVerifyEmail,
} from '../api/endpoints/auth';
import {
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
} from '../auth/storage';
import { PublicPageFrame } from '../components/layout/PublicPageFrame';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ToastProvider';
import { getApiErrorMessage, getApiErrorPayload } from '../utils/apiError';
import {
  PageTransition,
  buildStaggerContainer,
  buildStaggerItem,
  FORM_TRANSITION,
} from '../components/ui/Motion';

const OTP_LENGTH = 6;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clampRemainingSeconds = (nextAllowedAt: string | null) => {
  if (!nextAllowedAt) {
    return 0;
  }
  const targetMs = new Date(nextAllowedAt).getTime();
  if (Number.isNaN(targetMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
};

const formatRemainingTime = (remainingSec: number) => {
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

type VerifyBlockedState = {
  email: string;
  blockedUntil: string;
  remainingSec: number;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const clampBlockedSeconds = (blockedUntil: string) => {
  const blockedUntilMs = new Date(blockedUntil).getTime();
  if (Number.isNaN(blockedUntilMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil((blockedUntilMs - Date.now()) / 1000));
};

function extractVerifyBlockedState(
  error: unknown,
  email: string,
): VerifyBlockedState | null {
  const payload = getApiErrorPayload(error);
  if (payload?.code !== 'AUTH_VERIFY_EMAIL_CODE_BLOCKED') {
    return null;
  }
  if (typeof payload.blockedUntil !== 'string') {
    return null;
  }
  const payloadRemainingSec =
    typeof payload.remainingSec === 'number' && Number.isFinite(payload.remainingSec)
      ? Math.max(0, Math.ceil(payload.remainingSec))
      : 0;
  const remainingSec = Math.max(
    payloadRemainingSec,
    clampBlockedSeconds(payload.blockedUntil),
  );
  if (remainingSec <= 0) {
    return null;
  }
  return {
    email: normalizeEmail(email),
    blockedUntil: payload.blockedUntil,
    remainingSec,
  };
}

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const reduceMotion = useReducedMotion();
  const formVariants = buildStaggerContainer(0.05, 0.06);
  const itemVariants = buildStaggerItem(8);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const email = useMemo(() => (getPendingVerificationEmail() ?? '').trim(), []);
  const [codeDigits, setCodeDigits] = useState<string[]>(() =>
    Array.from({ length: OTP_LENGTH }, () => ''),
  );
  const [codeError, setCodeError] = useState('');
  const [codeShakeNonce, setCodeShakeNonce] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendRemainingSec, setResendRemainingSec] = useState(0);
  const [verifyBlockedState, setVerifyBlockedState] = useState<VerifyBlockedState | null>(null);

  const joinedCode = useMemo(() => codeDigits.join(''), [codeDigits]);
  const isEmailValid = emailPattern.test(email);
  const canSubmit =
    isEmailValid &&
    joinedCode.length === OTP_LENGTH &&
    !verifyBlockedState;
  const verifyButtonLabel = verifyBlockedState
    ? `Intente de nuevo en ${formatRemainingTime(verifyBlockedState.remainingSec)}`
    : isSubmitting
      ? 'Verificando...'
      : 'Verificar';

  useEffect(() => {
    if (resendRemainingSec <= 0) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setResendRemainingSec((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendRemainingSec]);

  useEffect(() => {
    if (!verifyBlockedState) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setVerifyBlockedState((current) => {
        if (!current) {
          return null;
        }
        const remainingSec = clampBlockedSeconds(current.blockedUntil);
        if (remainingSec <= 0) {
          return null;
        }
        if (remainingSec === current.remainingSec) {
          return current;
        }
        return { ...current, remainingSec };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [verifyBlockedState?.blockedUntil]);

  const syncVerificationStatus = (status: {
    remainingSec?: number;
    nextAllowedAt?: string | null;
    verifyRemainingSec?: number;
    verifyBlockedUntil?: string | null;
  }) => {
    setResendRemainingSec(
      Math.max(status.remainingSec ?? 0, clampRemainingSeconds(status.nextAllowedAt ?? null)),
    );
    if (
      typeof status.verifyBlockedUntil === 'string' &&
      Math.max(
        status.verifyRemainingSec ?? 0,
        clampBlockedSeconds(status.verifyBlockedUntil),
      ) > 0
    ) {
      setVerifyBlockedState({
        email: normalizeEmail(email),
        blockedUntil: status.verifyBlockedUntil,
        remainingSec: Math.max(
          status.verifyRemainingSec ?? 0,
          clampBlockedSeconds(status.verifyBlockedUntil),
        ),
      });
      return;
    }
    setVerifyBlockedState(null);
  };

  useEffect(() => {
    if (!emailPattern.test(email)) {
      clearPendingVerificationEmail();
      setResendRemainingSec(0);
      navigate('/login', { replace: true });
      return;
    }

    let isCancelled = false;
    authVerificationStatus({ email })
      .then((status) => {
        if (isCancelled) {
          return;
        }
        if (status.status !== 'PENDING_VERIFICATION') {
          clearPendingVerificationEmail();
          notify('El correo ya no requiere verificación', 'info');
          navigate('/login', { replace: true });
          return;
        }
        syncVerificationStatus(status);
      })
      .catch(() => {
        if (!isCancelled) {
          setResendRemainingSec(0);
          setVerifyBlockedState(null);
          clearPendingVerificationEmail();
          navigate('/login', { replace: true });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [email, navigate, notify]);

  const focusDigit = (index: number) => {
    const target = inputRefs.current[index];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const setCodeFromString = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
    const next = Array.from({ length: OTP_LENGTH }, (_, index) => digits[index] ?? '');
    setCodeDigits(next);
    setCodeError('');
    return digits.length;
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    const sanitized = rawValue.replace(/\D/g, '').slice(-1);
    setCodeDigits((current) => {
      const next = [...current];
      next[index] = sanitized;
      return next;
    });
    setCodeError('');
    if (sanitized && index < OTP_LENGTH - 1) {
      focusDigit(index + 1);
    }
  };

  const handleDigitKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Backspace' && !codeDigits[index] && index > 0) {
      focusDigit(index - 1);
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusDigit(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusDigit(index + 1);
    }
  };

  const handleDigitPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    const digitsCount = setCodeFromString(pasted);
    if (digitsCount > 0) {
      focusDigit(Math.min(digitsCount, OTP_LENGTH) - 1);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!joinedCode) {
      setCodeError('Ingresa el código');
      setCodeShakeNonce((current) => current + 1);
      return;
    }
    if (!isEmailValid) {
      notify('Correo inválido', 'error');
      return;
    }
    if (joinedCode.length < OTP_LENGTH) {
      return;
    }

    try {
      setIsSubmitting(true);
      await authVerifyEmail({ email, code: joinedCode });
      clearPendingVerificationEmail();
      notify('Correo verificado. Espera aprobación del administrador.', 'success');
      navigate('/login');
    } catch (error: any) {
      const blockedState = extractVerifyBlockedState(error, email);
      if (blockedState) {
        setVerifyBlockedState(blockedState);
        setCodeError('');
        return;
      }
      const message = getApiErrorMessage(error, 'Error al verificar');
      if (message === 'Codigo invalido' || message === 'Código inválido') {
        setCodeError('Código inválido');
        setCodeShakeNonce((current) => current + 1);
        return;
      }
      if (message === 'Codigo expirado' || message === 'Código expirado') {
        setCodeError('Código expirado');
        return;
      }
      if (error?.response?.status === 429) {
        try {
          const status = await authVerificationStatus({ email });
          syncVerificationStatus(status);
        } catch {
          // noop
        }
        return;
      }
      notify(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!isEmailValid) {
      notify('Correo inválido', 'error');
      return;
    }

    try {
      setIsResending(true);
      const response = await authResendVerificationCode({ email });
      syncVerificationStatus(response);
      notify('Código reenviado', 'success');
      setCodeDigits(Array.from({ length: OTP_LENGTH }, () => ''));
      setCodeError('');
      focusDigit(0);
    } catch (error: any) {
      const blockedState = extractVerifyBlockedState(error, email);
      if (blockedState) {
        setVerifyBlockedState(blockedState);
        return;
      }
      if (error?.response?.status === 429) {
        try {
          const status = await authVerificationStatus({ email });
          syncVerificationStatus(status);
        } catch {
          // noop
        }
        return;
      }
      const message = getApiErrorMessage(error, 'No se pudo reenviar el código');
      notify(message, 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <PageTransition>
      <PublicPageFrame>
        <motion.div
          className="w-full max-w-sm rounded-xl border border-brand-border bg-brand-surface/90 p-6 shadow-soft sm:max-w-md sm:p-8"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={FORM_TRANSITION}
        >
          <div className="text-center">
            <div className="font-display text-2xl text-brand-primary">Verificar correo</div>
            <p className="mt-2 text-sm text-brand-textMuted">
              Ingresa el código enviado a tu correo.
            </p>
          </div>
          <motion.form
            className="mt-6 space-y-4"
            onSubmit={handleSubmit}
            initial={reduceMotion ? false : 'hidden'}
            animate="show"
            variants={formVariants}
          >
            <motion.div variants={itemVariants} className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-brand-textMuted">
                Correo
              </label>
              <div className="rounded-full border border-brand-border bg-brand-bg px-4 py-3 text-sm text-brand-text">
                {isEmailValid ? email : 'Correo no disponible'}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-widest text-brand-textMuted">
                Código
              </label>
              <motion.div
                className="mx-auto w-full"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${OTP_LENGTH}, minmax(0, 1fr))`,
                  gap: '0.5rem',
                  maxWidth: '22rem',
                }}
                animate={
                  reduceMotion || codeShakeNonce === 0
                    ? undefined
                    : { x: [0, -8, 8, -6, 6, -3, 3, 0] }
                }
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {codeDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleDigitChange(index, event.target.value)}
                    onKeyDown={(event) => handleDigitKeyDown(index, event)}
                    onPaste={handleDigitPaste}
                    className={[
                      'min-w-0 rounded-xl border bg-brand-surface text-center text-lg font-semibold text-brand-text shadow-sm outline-none transition focus:border-brand-primary/60 focus:ring-2 focus:ring-brand-accent/20 sm:text-xl',
                      codeError
                        ? 'border-ember bg-ember/5 ring-2 ring-ember/15'
                        : 'border-brand-border',
                    ].join(' ')}
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                    }}
                    aria-label={`Dígito ${index + 1} del código`}
                  />
                ))}
              </motion.div>
              {codeError ? (
                <span className="text-xs text-ember">{codeError}</span>
              ) : null}
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4 pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !canSubmit}
              >
                {verifyButtonLabel}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mx-auto inline-flex"
                disabled={
                  isResending ||
                  resendRemainingSec > 0 ||
                  !isEmailValid ||
                  Boolean(verifyBlockedState)
                }
                onClick={handleResend}
              >
                {verifyBlockedState
                  ? 'Reenviar no disponible'
                  : isResending
                  ? 'Reenviando...'
                  : resendRemainingSec > 0
                    ? `Reenviar código en ${resendRemainingSec}s`
                    : 'Reenviar código'}
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </PublicPageFrame>
    </PageTransition>
  );
}
