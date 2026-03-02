import { Box, Button, Flex, Heading, Text } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      className="min-h-screen"
      style={{ backgroundColor: "var(--gray-2)" }}
    >
      <Flex direction="column" align="center" gap="6" className="px-4 text-center">
        {/* 404 Illustration */}
        <Box className="relative">
          <Text
            size="9"
            weight="bold"
            className="select-none"
            style={{
              fontSize: "12rem",
              lineHeight: 1,
              color: "var(--gray-4)",
            }}
          >
            404
          </Text>
          <Box className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Box
              className="flex h-24 w-24 animate-bounce items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--accent-a3)" }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--accent-11)" }}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </Box>
          </Box>
        </Box>

        {/* Text Content */}
        <Flex direction="column" gap="2" align="center">
          <Heading size="6">{t("error.notFound")}</Heading>
          <Text color="gray" size="3" style={{ maxWidth: "400px" }}>
            {t("error.somethingWrong")}
          </Text>
        </Flex>

        {/* Actions */}
        <Flex gap="3" mt="2">
          <Link to="/dashboard">
            <Button size="3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {t("error.goHome")}
            </Button>
          </Link>
          <Button size="3" variant="soft" color="gray" onClick={() => window.history.back()}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {t("common.cancel")}
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
