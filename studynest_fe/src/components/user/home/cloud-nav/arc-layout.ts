export const ARC_VIEWPORT = "(min-width: 768px) and (min-height: 540px)";
export const ARC_ORIGIN = { x: 48, y: 56 };
export const TRIGGER_CENTER = 28;

type ArcCard = readonly [angle: number, width: number, height: number];

interface Arc {
  radius: number;
  cards: readonly ArcCard[];
}

export const INNER_ARC: Arc = {
  radius: 188,
  cards: [
    [-8, 116, 46],
    [10, 124, 46],
    [28, 110, 48],
    [51, 97, 48],
    [88, 105, 48],
  ],
};

export const ACCOUNT_ARC: Arc = {
  radius: 372,
  cards: [
    [-4, 160, 50],
    [6, 160, 50],
    [16, 154, 50],
    [27, 160, 50],
    [40, 142, 50],
    [57, 148, 50],
    [84, 136, 50],
  ],
};

export const MEMBER_ARC: Arc = {
  ...ACCOUNT_ARC,
  // The lecturer-only learning link occupies the second slot.
  cards: ACCOUNT_ARC.cards.filter((_, index) => index !== 1),
};

export const GUEST_ARC: Arc = {
  radius: ACCOUNT_ARC.radius,
  cards: [
    [-4, 142, 50],
    [20, 142, 50],
  ],
};

export const HOME_SLOT = { left: 60, top: 4, width: 108, height: 48 };
export const SKIP_SLOT = { left: 0, top: 86, width: 136, height: 48 };
export const TOOLS_SLOT = { left: 516, top: 88, width: 218 };

export function arcPoint(radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: ARC_ORIGIN.x + radius * Math.cos(radians),
    y: ARC_ORIGIN.y + radius * Math.sin(radians),
  };
}

export function arcPath(radius: number, fromAngle: number, toAngle: number) {
  const start = arcPoint(radius, fromAngle);
  const end = arcPoint(radius, toAngle);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

export function arcSlot(arc: Arc, index: number) {
  const [angle, width, height] = arc.cards[index];
  const { x, y } = arcPoint(arc.radius, angle);
  const middle = Math.sin((Math.PI * (index + 1)) / (arc.cards.length + 1));
  return {
    left: x - width / 2,
    top: y - height / 2,
    width,
    height,
    z: middle * 30,
    rotateX: 5 - angle / 11,
    rotateY: (index - (arc.cards.length - 1) / 2) * -3,
  };
}
