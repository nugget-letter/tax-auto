import { describe, expect, it } from "vitest";
import { crossedMilestones, toDepth } from "./depth";

describe("toDepth", () => {
  it("바닥 근처(0.99 이상)는 완독으로 본다", () => {
    expect(toDepth(1)).toBe(100);
    expect(toDepth(0.995)).toBe(100);
  });

  it("그 외에는 내림한다", () => {
    expect(toDepth(0.5)).toBe(50);
    expect(toDepth(0.749)).toBe(74);
  });

  it("범위를 벗어난 값을 0으로 막는다", () => {
    expect(toDepth(0)).toBe(0);
    expect(toDepth(-1)).toBe(0);
    expect(toDepth(NaN)).toBe(0);
  });
});

describe("crossedMilestones", () => {
  it("한 번에 여러 지점을 지나면 모두 잡는다", () => {
    expect(crossedMilestones(0, 0.6)).toEqual([25, 50]);
  });

  it("이미 통과한 지점은 다시 잡지 않는다", () => {
    expect(crossedMilestones(50, 0.6)).toEqual([]);
  });

  it("위로 올렸다 내려와도 중복되지 않는다", () => {
    expect(crossedMilestones(75, 0.3)).toEqual([]);
  });

  it("끝까지 읽으면 100이 포함된다", () => {
    expect(crossedMilestones(0, 1)).toEqual([25, 50, 75, 100]);
    expect(crossedMilestones(75, 0.995)).toEqual([100]);
  });

  it("아직 아무것도 지나지 않았으면 비어 있다", () => {
    expect(crossedMilestones(0, 0.1)).toEqual([]);
  });
});
