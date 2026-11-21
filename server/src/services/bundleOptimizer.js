export function calculateMinimumBundles(groupSize, bundleSizes) {
  if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10000) {
    return { impossible: true, message: "Group size must be between 1 and 10000" };
  }

  const dp = new Array(groupSize + 1).fill(Infinity);
  const usedBundle = new Array(groupSize + 1).fill(null);
  dp[0] = 0;

  for (let size = 1; size <= groupSize; size++) {
    for (const bundle of bundleSizes) {
      if (bundle <= size && dp[size - bundle] + 1 < dp[size]) {
        dp[size] = dp[size - bundle] + 1;
        usedBundle[size] = bundle;
      }
    }
  }

  if (!Number.isFinite(dp[groupSize])) {
    return { impossible: true, minimumBundles: null, bundleQuantities: {} };
  }

  const bundleQuantities = {};
  let remaining = groupSize;
  while (remaining > 0) {
    const bundle = usedBundle[remaining];
    bundleQuantities[bundle] = (bundleQuantities[bundle] || 0) + 1;
    remaining -= bundle;
  }

  return { impossible: false, minimumBundles: dp[groupSize], bundleQuantities };
}
