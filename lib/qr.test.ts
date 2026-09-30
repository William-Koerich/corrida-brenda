import { describe, expect, it } from "vitest";
import { cameraErrorMessage, parseBibFromQr, ScanDebouncer } from "./qr";

describe("parseBibFromQr", () => {
  it("aceita só o número", () => {
    expect(parseBibFromQr("123")).toBe(123);
    expect(parseBibFromQr(" 7\n")).toBe(7);
  });

  it("recusa outros conteúdos", () => {
    expect(parseBibFromQr("https://exemplo.com/123")).toBeNull();
    expect(parseBibFromQr("12a")).toBeNull();
    expect(parseBibFromQr("0")).toBeNull();
    expect(parseBibFromQr("123456")).toBeNull();
    expect(parseBibFromQr("")).toBeNull();
  });
});

describe("ScanDebouncer", () => {
  it("ignora o mesmo código dentro do intervalo", () => {
    const d = new ScanDebouncer(4000);
    expect(d.accept("10", 0)).toBe(true);
    expect(d.accept("10", 100)).toBe(false);
    expect(d.accept("10", 3999)).toBe(false);
    expect(d.accept("10", 4000)).toBe(true);
  });

  it("códigos diferentes não se bloqueiam", () => {
    const d = new ScanDebouncer(4000);
    expect(d.accept("10", 0)).toBe(true);
    expect(d.accept("11", 10)).toBe(true);
  });
});

describe("cameraErrorMessage", () => {
  it("HTTP sem segurança", () => {
    expect(cameraErrorMessage(null, false)).toMatch(/HTTPS/);
  });

  it("permissão negada", () => {
    expect(cameraErrorMessage({ name: "NotAllowedError" })).toMatch(/Permissão da câmera negada/);
    expect(cameraErrorMessage("NotAllowedError: Permission denied")).toMatch(/negada/);
  });

  it("sem câmera / câmera ocupada", () => {
    expect(cameraErrorMessage({ name: "NotFoundError" })).toMatch(/Nenhuma câmera/);
    expect(cameraErrorMessage("NotReadableError: Could not start video source")).toMatch(/em uso/);
  });
});
