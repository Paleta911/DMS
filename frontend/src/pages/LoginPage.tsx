import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
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

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(4, 'Mínimo 4 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { notify } = useToast();
  const reduceMotion = useReducedMotion();
  const formVariants = buildStaggerContainer(0.05, 0.06);
  const itemVariants = buildStaggerItem(8);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values.email, values.password);
      notify('Bienvenido al DMS', 'success');
      navigate('/documents');
    } catch (error: any) {
      notify(getApiErrorMessage(error, 'Credenciales inválidas'), 'error');
    }
  });

  return (
    <PageTransition>
      <PublicPageFrame>
        <motion.div
          className="w-full max-w-sm rounded-xl border border-brand-border bg-brand-surface/90 p-6 shadow-soft sm:max-w-md sm:p-8"
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
            <div className="mt-4 font-display text-2xl text-brand-primary">BSM DMS</div>
            <p className="mt-2 text-sm text-brand-textMuted">
              Acceso seguro para gestión documental.
            </p>
          </div>
          <motion.form
            className="mt-6 space-y-4"
            onSubmit={onSubmit}
            initial={reduceMotion ? false : 'hidden'}
            animate="show"
            variants={formVariants}
          >
            <motion.div variants={itemVariants}>
              <Input label="Correo" type="email" error={errors.email?.message} {...register('email')} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input label="Contraseña" type="password" error={errors.password?.message} {...register('password')} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </motion.div>
          </motion.form>
          <div className="mt-4 text-center text-sm text-brand-textMuted">
            ¿No tienes cuenta?{' '}
            <Link className="font-semibold text-brand-primary hover:underline" to="/register">
              Regístrate
            </Link>
          </div>
        </motion.div>
      </PublicPageFrame>
    </PageTransition>
  );
}
