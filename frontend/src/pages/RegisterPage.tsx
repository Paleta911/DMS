import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { authRegister } from '../api/endpoints/auth';
import { PublicPageFrame } from '../components/layout/PublicPageFrame';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ToastProvider';
import { bsmLogoUrl } from '../utils/brand';
import { getApiErrorMessage } from '../utils/apiError';
import {
  PageTransition,
  buildStaggerContainer,
  buildStaggerItem,
  FORM_TRANSITION,
} from '../components/ui/Motion';

const domain = 'bsm.com.mx';
const passwordPolicyMessage =
  'Debe tener al menos 8 caracteres e incluir mayúscula, minúscula y número';
const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/;

const schema = z
  .object({
    nombre: z.string().min(2, 'Nombre requerido'),
    primerApellido: z.string().min(2, 'Primer apellido requerido'),
    segundoApellido: z.string().optional(),
    email: z.string().email('Correo inválido').refine((value) => value.toLowerCase().endsWith(`@${domain}`), {
      message: `El correo debe terminar en @${domain}`,
    }),
    telefono: z.string().optional(),
    fechaNacimiento: z.string().optional(),
    password: z
      .string()
      .min(8, passwordPolicyMessage)
      .regex(passwordPolicy, passwordPolicyMessage),
    confirmPassword: z.string().min(8, passwordPolicyMessage),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const reduceMotion = useReducedMotion();
  const formVariants = buildStaggerContainer(0.05, 0.05);
  const itemVariants = buildStaggerItem(8);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      primerApellido: '',
      segundoApellido: '',
      email: '',
      telefono: '',
      fechaNacimiento: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        segundoApellido: values.segundoApellido || undefined,
        telefono: values.telefono || undefined,
        fechaNacimiento: values.fechaNacimiento || undefined,
      };
      await authRegister(payload);
      notify('Registro creado. Revisa tu correo para verificar.', 'success');
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (error: any) {
      notify(getApiErrorMessage(error, 'Error al registrar'), 'error');
    }
  });

  return (
    <PageTransition>
      <PublicPageFrame>
        <motion.div
          className="w-full max-w-lg rounded-xl border border-brand-border bg-brand-surface/90 p-6 shadow-soft sm:p-8"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={FORM_TRANSITION}
        >
          <div className="flex flex-col items-center text-center">
            {bsmLogoUrl ? (
              <img src={bsmLogoUrl} alt="BSM" className="h-14 w-14 object-contain" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-primary text-lg font-bold text-white">
                BSM
              </div>
            )}
            <div className="mt-4 font-display text-2xl text-brand-primary">Crear cuenta</div>
            <p className="mt-2 text-sm text-brand-textMuted">
              Regístrate con correo corporativo @{domain}.
            </p>
          </div>
          <motion.form
            className="mt-6 grid gap-4 sm:grid-cols-2"
            onSubmit={onSubmit}
            initial={reduceMotion ? false : 'hidden'}
            animate="show"
            variants={formVariants}
          >
            <motion.div variants={itemVariants}>
              <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input label="Primer apellido" error={errors.primerApellido?.message} {...register('primerApellido')} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input label="Segundo apellido" error={errors.segundoApellido?.message} {...register('segundoApellido')} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input label="Teléfono" error={errors.telefono?.message} {...register('telefono')} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input label="Correo" type="email" error={errors.email?.message} {...register('email')} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input
                label="Fecha de nacimiento"
                type="date"
                error={errors.fechaNacimiento?.message}
                {...register('fechaNacimiento')}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input
                label="Contraseña"
                type="password"
                error={errors.password?.message}
                hint={passwordPolicyMessage}
                {...register('password')}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input
                label="Confirmar contraseña"
                type="password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </motion.div>
            <motion.div variants={itemVariants} className="sm:col-span-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Registrando...' : 'Crear cuenta'}
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </PublicPageFrame>
    </PageTransition>
  );
}
