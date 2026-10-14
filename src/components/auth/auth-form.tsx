"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(60),
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(8, "Use pelo menos 8 caracteres").max(128),
});

type Mode = "login" | "signup";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  USER_ALREADY_EXISTS: "Já existe uma conta com este e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com este e-mail.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
};

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const isSignup = mode === "signup";

  const form = useForm<{ name?: string; email: string; password: string }>({
    resolver: zodResolver(isSignup ? signupSchema : loginSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: { name?: string; email: string; password: string }) {
    setFormError(null);
    const { error } = isSignup
      ? await signUp.email({ name: values.name!, email: values.email, password: values.password })
      : await signIn.email({ email: values.email, password: values.password });

    if (error) {
      setFormError(ERROR_MESSAGES[error.code ?? ""] ?? error.message ?? "Não foi possível continuar.");
      return;
    }
    router.replace(safeNext(params.get("next")));
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{isSignup ? "Crie sua conta" : "Entrar no DevFlow"}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {isSignup ? "Leva menos de um minuto." : "Bom ter você de volta."}
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-8 grid gap-4">
        {isSignup && (
          <FormField id="name" label="Nome" error={errors.name?.message}>
            <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
          </FormField>
        )}
        <FormField id="email" label="E-mail" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...form.register("email")} />
        </FormField>
        <FormField
          id="password"
          label="Senha"
          error={errors.password?.message}
          hint={isSignup ? "Mínimo de 8 caracteres." : undefined}
        >
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
        </FormField>

        {formError && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSignup ? "Criar conta" : "Entrar"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {isSignup ? "Já tem conta? " : "Ainda não tem conta? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-foreground underline-offset-4 hover:underline">
          {isSignup ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </div>
  );
}
