import { describe,expect,it } from "vitest";
import { generateTemporaryPassword,internalAuthIdentifier,normalizeUsername } from "./username";
describe("username seguro",()=>{
  it("normaliza caixa sem consultar o banco",()=>expect(normalizeUsername("  Studio.Joao ")).toBe("studio.joao"));
  it("rejeita espaços e nomes reservados",()=>{expect(()=>normalizeUsername("joao studio")).toThrow();expect(()=>normalizeUsername("admin")).toThrow()});
  it("permite explicitamente o master definido",()=>expect(normalizeUsername("NEXO.ADMIN",true)).toBe("nexo.admin"));
  it("gera identificador interno determinístico",()=>expect(internalAuthIdentifier("rafael.demo")).toBe("rafael.demo@auth.nexo.invalid"));
  it("gera senha temporária forte sem persistência",()=>{const value=generateTemporaryPassword();expect(value.length).toBe(20);expect(value).not.toBe(generateTemporaryPassword())});
});
