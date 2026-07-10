import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "../auth/AuthContext";
import { PublicPageFrame } from "../components/layout/PublicPageFrame";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../components/ToastProvider";
import { bsmLogoUrl } from "../utils/brand";
import {
  PASSWORD_MAX_LENGTH,
  USER_EMAIL_MAX_LENGTH,
} from "../constants/fieldLimits";
import { getApiErrorMessage, getApiErrorPayload } from "../utils/apiError";
import { setPendingVerificationEmail } from "../auth/storage";
import {
  PageTransition,
  buildStaggerContainer,
  buildStaggerItem,
  FORM_TRANSITION,
} from "../components/ui/Motion";

const schema = z.object({
  email: z
    .string()
    .max(USER_EMAIL_MAX_LENGTH, `Máximo ${USER_EMAIL_MAX_LENGTH} caracteres`)
    .email("Correo inválido"),
  password: z
    .string()
    .min(4, "Mínimo 4 caracteres")
    .max(PASSWORD_MAX_LENGTH, `Máximo ${PASSWORD_MAX_LENGTH} caracteres`),
});

type FormValues = z.infer<typeof schema>;

type LoginBlockedState = {
  email: string;
  blockedUntil: string;
  remainingSec: number;
};

type AccountAccessState = {
  code: "AUTH_ACCOUNT_SUSPENDED" | "AUTH_ACCOUNT_REMOVED";
  title: string;
  description: string;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const clampRemainingSeconds = (blockedUntil: string) => {
  const blockedUntilMs = new Date(blockedUntil).getTime();
  if (Number.isNaN(blockedUntilMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil((blockedUntilMs - Date.now()) / 1000));
};

const formatRemainingTime = (remainingSec: number) => {
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

function extractLoginBlockedState(
  error: unknown,
  email: string,
): LoginBlockedState | null {
  // Maps API lockout payload to local countdown state.
  const payload = getApiErrorPayload(error);
  if (payload?.code !== "AUTH_LOGIN_ACCOUNT_BLOCKED") {
    return null;
  }
  if (typeof payload.blockedUntil !== "string") {
    return null;
  }
  const normalizedEmail = normalizeEmail(email);
  const payloadRemainingSec =
    typeof payload.remainingSec === "number" &&
    Number.isFinite(payload.remainingSec)
      ? Math.max(0, Math.ceil(payload.remainingSec))
      : 0;
  const remainingSec = Math.max(
    payloadRemainingSec,
    clampRemainingSeconds(payload.blockedUntil),
  );
  if (!normalizedEmail || remainingSec <= 0) {
    return null;
  }
  return {
    email: normalizedEmail,
    blockedUntil: payload.blockedUntil,
    remainingSec,
  };
}

function extractAccountAccessState(error: unknown): AccountAccessState | null {
  const payload = getApiErrorPayload(error);
  if (payload?.code === "AUTH_ACCOUNT_SUSPENDED") {
    return {
      code: "AUTH_ACCOUNT_SUSPENDED",
      title: "Cuenta suspendida por el administrador",
      description:
        "Cuenta suspendida por el administrador. No puedes acceder al sistema.",
    };
  }
  if (payload?.code === "AUTH_ACCOUNT_REMOVED") {
    return {
      code: "AUTH_ACCOUNT_REMOVED",
      title: "Cuenta eliminada por el administrador",
      description:
        "Cuenta eliminada por el administrador. Esta cuenta ya no está disponible.",
    };
  }
  return null;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { notify } = useToast();
  const reduceMotion = useReducedMotion();
  const [loginInlineError, setLoginInlineError] = useState<string | null>(null);
  const [showPendingApprovalModal, setShowPendingApprovalModal] =
    useState(false);
  const [showLoginBlockedModal, setShowLoginBlockedModal] = useState(false);
  const [accountAccessState, setAccountAccessState] =
    useState<AccountAccessState | null>(null);
  const [loginBlockedState, setLoginBlockedStateState] =
    useState<LoginBlockedState | null>(null);
  const formVariants = buildStaggerContainer(0.05, 0.06);
  const itemVariants = buildStaggerItem(8);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const loginBlockedLabel = loginBlockedState
    ? formatRemainingTime(loginBlockedState.remainingSec)
    : null;

  useEffect(() => {
    if (!loginBlockedState) {
      return undefined;
    }

    const syncRemaining = () => {
      // Keep UI timer aligned with server-provided block expiration.
      const remainingSec = clampRemainingSeconds(
        loginBlockedState.blockedUntil,
      );
      if (remainingSec <= 0) {
        setLoginBlockedStateState(null);
        setShowLoginBlockedModal(false);
        return;
      }
      setLoginBlockedStateState((current) => {
        if (
          !current ||
          current.email !== loginBlockedState.email ||
          current.blockedUntil !== loginBlockedState.blockedUntil ||
          current.remainingSec === remainingSec
        ) {
          return current;
        }
        return { ...current, remainingSec };
      });
    };

    syncRemaining();
    const timer = window.setInterval(syncRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [loginBlockedState?.blockedUntil, loginBlockedState?.email]);

  const onSubmit = handleSubmit(async (values) => {
    setLoginInlineError(null);
    setAccountAccessState(null);
    try {
      await login(values.email, values.password);
      setLoginBlockedStateState(null);
      setShowLoginBlockedModal(false);
      setAccountAccessState(null);
      setLoginInlineError(null);
      notify("Bienvenido al SGCI - CEP", "success");
      navigate("/documents");
    } catch (error: any) {
      // Prioritize explicit auth states before falling back to generic message handling.
      const blockedState = extractLoginBlockedState(error, values.email);
      if (blockedState) {
        setLoginBlockedStateState(blockedState);
        setShowLoginBlockedModal(true);
        return;
      }
      const accountState = extractAccountAccessState(error);
      if (accountState) {
        setAccountAccessState(accountState);
        return;
      }
      const message = getApiErrorMessage(error, "Credenciales inválidas");
      if (message === "Correo pendiente de verificación") {
        setPendingVerificationEmail(values.email);
        notify("Verifica tu correo para continuar", "info");
        navigate("/verify-email");
        return;
      }
      if (message === "Cuenta pendiente de aprobación por el administrador") {
        setShowPendingApprovalModal(true);
        return;
      }
      if (message === "Registro rechazado") {
        setLoginInlineError(
          "Tu registro fue rechazado por el administrador. Esta cuenta no puede iniciar sesión.",
        );
        return;
      }
      notify(message, "error");
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
              <img
                src={bsmLogoUrl}
                alt="BSM"
                className="h-14 w-14 object-contain"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-primary text-lg font-bold text-white">
                BSM
              </div>
            )}
            <div className="mt-4 font-display text-2xl text-brand-primary">
              SGCI - Central El Potrero
            </div>
            <p className="mt-2 text-sm text-brand-textMuted">
              Acceso seguro para estructura documental.
            </p>
          </div>
          <motion.form
            className="mt-6 space-y-4"
            onSubmit={onSubmit}
            autoComplete="on"
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            variants={formVariants}
          >
            <motion.div variants={itemVariants}>
              <Input
                label="Correo"
                type="email"
                error={errors.email?.message}
                maxLength={USER_EMAIL_MAX_LENGTH}
                autoComplete="username"
                {...register("email")}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Input
                label="Contraseña"
                type="password"
                error={errors.password?.message}
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete="current-password"
                {...register("password")}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Ingresando..." : "Ingresar"}
              </Button>
            </motion.div>
            {loginInlineError ? (
              <motion.p
                variants={itemVariants}
                className="text-center text-sm font-medium text-red-400"
              >
                {loginInlineError}
              </motion.p>
            ) : null}
          </motion.form>
          <div className="mt-4 text-center text-sm text-brand-textMuted">
            ¿No tienes cuenta?{" "}
            <Link
              className="font-semibold text-brand-primary hover:underline"
              to="/register"
            >
              Regístrate
            </Link>
          </div>
        </motion.div>
        <Modal
          open={showPendingApprovalModal}
          title="Cuenta pendiente"
          onClose={() => setShowPendingApprovalModal(false)}
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-brand-text">
              Cuenta pendiente de aprobación por el administrador, será aprobado
              en un lapso de 24hrs.
            </p>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setShowPendingApprovalModal(false)}
              >
                Entendido
              </Button>
            </div>
          </div>
        </Modal>
        <Modal
          open={showLoginBlockedModal && Boolean(loginBlockedState)}
          title="Cuenta bloqueada temporalmente"
          onClose={() => setShowLoginBlockedModal(false)}
        >
          <div className="space-y-5 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-display text-ember sm:text-5xl">
                {loginBlockedLabel ?? "0:00"}
              </div>
              <p className="text-sm leading-6 text-brand-text">
                Tu cuenta fue bloqueada por intentos fallidos. Intenta de nuevo
                cuando termine el contador.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              Correo bloqueado: {loginBlockedState?.email ?? "-"}
            </div>
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={() => setShowLoginBlockedModal(false)}
              >
                Entendido
              </Button>
            </div>
          </div>
        </Modal>
        <Modal
          open={Boolean(accountAccessState)}
          title={accountAccessState?.title ?? "Cuenta no disponible"}
          onClose={() => setAccountAccessState(null)}
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-brand-text">
              {accountAccessState?.description ??
                "No es posible iniciar sesión con esta cuenta."}
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setAccountAccessState(null)}>
                Entendido
              </Button>
            </div>
          </div>
        </Modal>
      </PublicPageFrame>
    </PageTransition>
  );
}
