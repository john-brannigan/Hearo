import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';
import { TouchableOpacity, Text } from 'react-native';

type Props = {
  href: string;
  children?: React.ReactNode;
} & ComponentProps<typeof TouchableOpacity>;

export function ExternalLink({ href, children, ...rest }: Props) {
  const onPress = async () => {
    if (typeof document !== 'undefined' && window && process.env.EXPO_OS === 'web') {
      // Web: open in new tab
      window.open(href, '_blank');
      return;
    }

    // Native: open in-app browser
    await openBrowserAsync(href, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  };

  return (
    <TouchableOpacity {...rest} onPress={onPress}>
      {children ? children : <Text>{href}</Text>}
    </TouchableOpacity>
  );
}
