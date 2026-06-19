import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useReduceMotion } from './useReduceMotion';
import { ConfettiPiece, makeConfettiPieces } from './Celebration';

const PIECE_COUNT = 20;
const PALETTE = ['#FF9EB5', '#5FD9A6', '#FFD66B', '#FF8C42'];

interface CardConfettiProps {
  /** Plays a fresh burst whenever this flips to true. */
  active: boolean;
  width: number;
  height: number;
}

/** Small confetti burst confined to a card's bounds — same falling-piece
 *  animation as the full-screen Celebration, just scaled down and clipped
 *  by the card's own `overflow: hidden`. */
export function CardConfetti({ active, width, height }: CardConfettiProps) {
  const reduceMotion = useReduceMotion();

  const pieces = useMemo(() => {
    if (!active || reduceMotion || width <= 0) return [];
    return makeConfettiPieces(PIECE_COUNT, width, PALETTE);
  }, [active, reduceMotion, width]);

  if (pieces.length === 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.key} piece={p} fallDistance={height} />
      ))}
    </View>
  );
}
