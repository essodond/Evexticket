import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

/** Decorative vector artwork that stays crisp at every screen density. */
export default function TravelHeaderArtwork() {
  return (
    <Svg width="270" height="170" viewBox="0 0 270 170">
      <Circle cx="216" cy="74" r="70" fill="#FFFFFF" opacity={0.05} />
      <Circle cx="216" cy="74" r="48" fill="#FFFFFF" opacity={0.04} />
      <Path
        d="M12 152C55 114 99 171 143 132S203 105 271 125"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeDasharray="4 8"
        strokeLinecap="round"
        opacity={0.2}
      />
      <G transform="translate(125 35) rotate(-8 65 40)" opacity={0.2}>
        <Path
          d="M8 12Q8 4 18 4H105Q115 4 119 14L128 38V65H8Z"
          fill="#FFFFFF"
          fillOpacity={0.18}
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <Rect x="17" y="14" width="23" height="23" rx="3" fill="#FFFFFF" />
        <Rect x="46" y="14" width="23" height="23" rx="3" fill="#FFFFFF" />
        <Rect x="75" y="14" width="20" height="23" rx="3" fill="#FFFFFF" />
        <Path d="M103 14H111L120 37H103Z" fill="#FFFFFF" />
        <Path d="M15 47H96M105 45V60M4 65H132" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <Rect x="118" y="50" width="7" height="5" rx="2" fill="#FFFFFF" />
        <Circle cx="32" cy="65" r="10" fill="#FFFFFF" />
        <Circle cx="105" cy="65" r="10" fill="#FFFFFF" />
        <Circle cx="32" cy="65" r="4" fill="#0A84FF" />
        <Circle cx="105" cy="65" r="4" fill="#0A84FF" />
      </G>
      <G transform="translate(68 77)" opacity={0.16}>
        <Path d="M0 12C0-4 24-4 24 12C24 22 12 33 12 33S0 22 0 12Z" fill="none" stroke="#FFFFFF" strokeWidth="2" />
        <Circle cx="12" cy="12" r="4" fill="#FFFFFF" />
      </G>
      <Path d="M95 34H110M102.5 26.5V41.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity={0.18} />
    </Svg>
  );
}
