import "dotenv/config";

// Testes SEMPRE usam o banco de testes — nunca o DATABASE_URL de desenvolvimento/produção.
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Defina TEST_DATABASE_URL para rodar os testes.");
process.env.DATABASE_URL = url;
process.env.APP_TIMEZONE = "America/Sao_Paulo";
process.env.BETTER_AUTH_SECRET ||= "test-secret-test-secret-test-secret-0000";
process.env.BETTER_AUTH_URL ||= "http://localhost:3000";
