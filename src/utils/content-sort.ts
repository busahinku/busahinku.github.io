type PinnableContent = {
  data: {
    pinned?: boolean;
    pubDate: Date;
  };
};

export function comparePinnedThenNewest(
  a: PinnableContent,
  b: PinnableContent,
): number {
  const pinOrder = Number(Boolean(b.data.pinned)) - Number(Boolean(a.data.pinned));

  return pinOrder || b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
}
