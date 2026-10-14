export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" = "VALIDATION",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("Sessão expirada. Entre novamente.", "UNAUTHORIZED");
  }
}

/** Usado também quando o registro existe mas pertence a outro usuário — não revelamos a diferença. */
export class NotFoundError extends AppError {
  constructor(entity = "Registro") {
    super(`${entity} não encontrado.`, "NOT_FOUND");
  }
}
