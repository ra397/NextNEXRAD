const EARTH_RADIUS = 6_371_000;
const K0 = 1 / (4 * EARTH_RADIUS);

function calculateBeamHeights(groundRanges, eaDeg, elevation) {
    const eaRad = eaDeg * Math.PI / 180;

    const slantRanges = groundRanges.map(s => {
        const a = EARTH_RADIUS;
        const kappa = K0 * Math.cos(eaRad);
        const s_a = s / a;
        const inner = a * kappa * Math.sin(s_a) - Math.sin(eaRad + s_a);
        return (1 / kappa) * (eaRad + s_a + Math.asin(inner));
    });

    const beamHeights = slantRanges.map(r => {
        const a = EARTH_RADIUS;
        const kappa = K0 * Math.cos(eaRad);
        const kr = kappa * r;
        const sin_kr = Math.sin(kr);
        const one_minus_cos_kr = 1 - Math.cos(kr);
        
        const S = (sin_kr / kappa) * Math.cos(eaRad) + (one_minus_cos_kr / kappa) * Math.sin(eaRad);
        const H = (sin_kr / kappa) * Math.sin(eaRad) - (one_minus_cos_kr / kappa) * Math.cos(eaRad);
        
        return Math.sqrt((a + H) ** 2 + S ** 2) - a + elevation;
    });

    return beamHeights;
}