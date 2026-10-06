import { describe, expect, it } from "vitest";
import { liveState } from "./live-indicator";

describe("liveState", () => {
  const now = 1_000_000;

  it("ao vivo quando conferiu há pouco", () => {
    expect(liveState({ online: true, lastSync: now - 400 }, now)).toEqual({ tone: "live", text: "Ao vivo · atualizado agora" });
    expect(liveState({ online: true, lastSync: now - 4_000 }, now).text).toBe("Ao vivo · atualizado há 4 s");
  });

  it("avisa quando passou de 20 s sem atualizar", () => {
    expect(liveState({ online: true, lastSync: now - 31_000 }, now)).toEqual({ tone: "stale", text: "Atualizado há 31 s" });
  });

  it("sem conexão e ainda conectando", () => {
    expect(liveState({ online: false, lastSync: now }, now).tone).toBe("offline");
    expect(liveState({ online: true, lastSync: null }, now).tone).toBe("loading");
  });
});
