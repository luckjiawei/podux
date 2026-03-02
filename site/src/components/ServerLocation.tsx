import { Flex, Text } from "@radix-ui/themes";
import { Icon } from "@iconify/react";

interface GeoLocation {
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
}

interface ServerLocationProps {
  geoLocation?: GeoLocation;
  size?: "1" | "2" | "3";
  showISP?: boolean;
}

export function ServerLocation({ geoLocation, size = "2", showISP = true }: ServerLocationProps) {
  if (!geoLocation) {
    return (
      <Text size={size} color="gray">
        -
      </Text>
    );
  }

  const locationText = geoLocation.city || geoLocation.region || geoLocation.country;

  return (
    <Flex direction="column" gap="0">
      <Flex align="center" gap="1">
        <Icon icon="lucide:map-pin" width="12" height="12" color="var(--gray-11)" />
        <Text size={size} weight="medium">
          {locationText || "Unknown"}
        </Text>
      </Flex>
      {showISP && geoLocation.isp && (
        <Text size="1" color="gray">
          {geoLocation.isp}
        </Text>
      )}
    </Flex>
  );
}
