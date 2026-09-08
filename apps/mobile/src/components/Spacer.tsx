import { View } from 'react-native';

/** Fixed gap. `height` for vertical rhythm, `width` for horizontal. */
export function Spacer({ height = 0, width = 0 }: { height?: number; width?: number }) {
  return <View style={{ height, width }} />;
}
