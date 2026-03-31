import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { authVerifyEmail } from '../api/endpoints/auth';
import { PublicPageFrame } from '../components/layout/PublicPageFrame';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ToastProvider';
import { getApiErrorMessage } from '../utils/apiError';
import {
  PageTransition,
  buildStaggerContainer,
  buildStaggerItem,
  FORM_TRANSITION,
} from '../components/ui/Motion';

const schema = z.object({
  email: z.string().email('Correo inválido'),
  code: z.string().min(6, 'Código de 6 dígitos').max(6, 'Código de 6 dígitos'),
});

type FormValues = z.infer<typeof schema>;

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
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
    defaultValues: { email: params.get('email') ?? '', code: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authVerifyEmail(values);
      notify('Correo verificado. Espera aprobación del administrador.', 'success');
      navigate('/login');
    } catch (error: any) {
      notify(getApiErrorMessage(error, 'Error al verificar'), 'error');
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
          <div className="text-center">
            <div className="font-display text-2xl text-brand-primary">Verificar correo</div>
            <p className="mt-2 text-sm text-brand-textMuted">
              Ingresa el código de 6 dígitos enviado a tu correo.
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
              <Input label="Código" error={errors.code?.message} {...register('code')} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Verificando...' : 'Verificar'}
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </PublicPageFrame>
    </PageTransition>
  );
}
