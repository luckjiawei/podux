import { Avatar, Box, DropdownMenu, Flex, Popover, Text } from "@radix-ui/themes";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import pb from "../lib/pocketbase";
import { getGravatarUrl } from "../lib/gravatar";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";
import logo from "../assets/logo.png";
import { Icon } from "@iconify/react";

interface MainLayoutProps {
  children: ReactNode;
}

// Detect mobile by user agent OR viewport width < 640px (sm breakpoint).
// Uses matchMedia so the layout re-evaluates only when the threshold is crossed,
// not on every pixel change.
function useIsMobile() {
  const isUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

  const [isSmall, setIsSmall] = useState(() => window.matchMedia("(max-width: 639px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isUA || isSmall;
}

function isNewerVersion(latest: string, current: string): boolean {
  const clean = (v: string) => v.replace(/^v/, "");
  const parts = (v: string) => clean(v).split(".").map(Number);
  const [la, lb, lc] = parts(latest);
  const [ca, cb, cc] = parts(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

const navItems = [
  {
    labelKey: "nav.dashboard",
    path: "/dashboard",
    icon: <Icon icon="lucide:layout-dashboard" width="18" height="18" />,
  },
  {
    labelKey: "nav.servers",
    path: "/servers",
    icon: <Icon icon="lucide:server" width="18" height="18" />,
  },
  {
    labelKey: "nav.proxies",
    path: "/proxies",
    icon: <Icon icon="lucide:network" width="18" height="18" />,
  },
];

const mobileBottomNavItems = navItems;

const handleLogout = () => {
  pb.authStore.clear();
  window.location.href = "/login";
};

const handleGotoProfile = () => {
  window.location.href = "/settings?tab=profile";
};

export function MainLayout({ children }: MainLayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [appVersion, setAppVersion] = useState<string>("");
  const [latestVersion, setLatestVersion] = useState<string>("");
  const [releaseUrl, setReleaseUrl] = useState<string>("");
  const updateAvailable = appVersion && latestVersion ? isNewerVersion(latestVersion, appVersion) : false;

  useEffect(() => {
    fetch("/api/system/version")
      .then((res) => res.json())
      .then((data) => data.version && setAppVersion(data.version))
      .catch(() => {});

    fetch("/api/system/latest-version")
      .then((res) => res.json())
      .then((data) => {
        if (data.tag_name) setLatestVersion(data.tag_name);
        if (data.html_url) setReleaseUrl(data.html_url);
      })
      .catch(() => {});
  }, []);

  // Get current user info from PocketBase authStore
  const currentUser = pb.authStore.record;
  const userEmail = currentUser?.email || "";
  const userNickName = currentUser?.nickname || "";
  const gravatarUrl = currentUser?.avatar
    ? pb.files.getURL(currentUser, currentUser.avatar)
    : getGravatarUrl(userEmail, 80);

  return (
    <Flex direction="column" className="min-h-screen" style={{ backgroundColor: "var(--gray-2)", minWidth: "320px" }}>
      {/* Top Navigation */}
      <Box
        style={{
          backgroundColor: "var(--color-background)",
          borderBottom: "1px solid var(--gray-6)",
        }}
        className="sticky top-0 z-50"
      >
        <Box className="mx-auto box-border max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Flex justify="between" align="center">
            {/* Left: Logo + Desktop Nav */}
            <Flex align="center" gap="8" style={{ minWidth: 0 }}>
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Link to="/" className="no-underline">
                  <Flex align="center" gap="2">
                    <motion.img
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        delay: 0.1,
                      }}
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      whileTap={{ scale: 0.95 }}
                      src={logo}
                      alt="Frpc Hub Logo"
                      className="h-8 w-8 cursor-pointer rounded-2xl object-contain"
                    />
                    <Text size="4" weight="bold">
                      Frpc Hub
                    </Text>
                  </Flex>
                </Link>
              </motion.div>

              {/* Desktop Navigation Menu */}
              {!isMobile && (
                <Flex gap="1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link key={item.path} to={item.path} className="relative no-underline">
                        <motion.div
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className="relative"
                        >
                          <Flex
                            align="center"
                            gap="2"
                            className="relative z-10 rounded-lg px-4 py-2 transition-colors"
                            style={{
                              color: isActive ? "var(--accent-11)" : "var(--gray-11)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.icon}
                            <Text size="2" weight="medium">
                              {t(item.labelKey)}  
                            </Text>
                          </Flex>
                          {isActive && (
                            <motion.div
                              layoutId="active-nav"
                              className="absolute inset-0 rounded-lg bg-[var(--accent-a3)]"
                              transition={{
                                type: "spring",
                                bounce: 0.2,
                                duration: 0.6,
                              }}
                            />
                          )}
                        </motion.div>
                      </Link>
                    );
                  })}
                </Flex>
              )}
            </Flex>

            {/* Right: Controls */}
            <Flex align="center" gap={isMobile ? "2" : "4"} style={{ flexShrink: 0 }}>
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Language Toggle */}
              <LanguageToggle />

              {/* Update Available Badge */}
              {updateAvailable && (
                <Popover.Root>
                  <Popover.Trigger>
                    <motion.div
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.05 }}
                      className="relative cursor-pointer rounded-lg p-2 transition-colors hover:bg-[var(--amber-a3)]"
                      style={{ color: "var(--amber-11)" }}
                    >
                      <Icon icon="lucide:arrow-up-circle" width="20" height="20" />
                      <span
                        className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--amber-9)]"
                        style={{ display: "block" }}
                      />
                    </motion.div>
                  </Popover.Trigger>
                  <Popover.Content style={{ maxWidth: 280 }}>
                    <Flex direction="column" gap="3">
                      <Flex align="center" gap="2">
                        <Icon icon="lucide:package" width="16" height="16" style={{ color: "var(--amber-11)" }} />
                        <Text size="2" weight="bold">
                          {t("version.updateAvailable")}
                        </Text>
                      </Flex>
                      <Flex direction="column" gap="1">
                        <Flex justify="between">
                          <Text size="1" color="gray">{t("version.current")}</Text>
                          <Text size="1" weight="medium">v{appVersion}</Text>
                        </Flex>
                        <Flex justify="between">
                          <Text size="1" color="gray">{t("version.latest")}</Text>
                          <Text size="1" weight="medium" style={{ color: "var(--amber-11)" }}>{latestVersion}</Text>
                        </Flex>
                      </Flex>
                      {releaseUrl && (
                        <a href={releaseUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                          <Flex
                            align="center"
                            gap="1"
                            className="rounded-md px-3 py-2 transition-colors hover:bg-[var(--amber-a3)]"
                            style={{ color: "var(--amber-11)" }}
                          >
                            <Icon icon="lucide:external-link" width="14" height="14" />
                            <Text size="1" weight="medium">{t("version.updateNow")}</Text>
                          </Flex>
                        </a>
                      )}
                    </Flex>
                  </Popover.Content>
                </Popover.Root>
              )}

              {/* Settings */}
              <Link to="/settings" className="no-underline">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  whileHover="hover"
                  className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-[var(--gray-a3)]"
                >
                  <motion.div
                    variants={{ hover: { scale: 1.1, rotate: 30 } }}
                    className="flex items-center justify-center"
                  >
                    <Icon icon="lucide:settings" width="20" height="20" />
                  </motion.div>
                </motion.div>
              </Link>

              {/* User Dropdown */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Flex align="center" gap="2" className="cursor-pointer">
                      <Avatar
                        size="2"
                        src={gravatarUrl}
                        fallback={userNickName.charAt(0).toUpperCase()}
                        radius="full"
                      />
                      {/* Show name/email only on desktop */}
                      {!isMobile && (
                        <Flex direction="column" gap="0">
                          <Text size="2" weight="medium">
                            {userNickName}
                          </Text>
                          <Text size="1" color="gray">
                            {userEmail}
                          </Text>
                        </Flex>
                      )}
                    </Flex>
                  </motion.div>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item onClick={handleGotoProfile}>
                    <Icon icon="lucide:user" width="16" height="16" /> {t("settings.profile")}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item color="red" onClick={handleLogout}>
                    <Icon icon="lucide:log-out" width="16" height="16" /> {t("nav.logout")}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Flex>
          </Flex>
        </Box>
      </Box>

      {/* Main Content */}
      <Box className="flex w-full flex-1 flex-col overflow-y-auto">
        <Box
          className="mx-auto box-border min-h-full w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
          style={{ paddingBottom: isMobile ? "72px" : undefined }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>{children}</PageTransition>
          </AnimatePresence>
        </Box>
      </Box>

      {/* Footer — desktop only */}
      {!isMobile && (
        <Box
          style={{
            backgroundColor: "var(--color-background)",
            borderTop: "1px solid var(--gray-6)",
          }}
        >
          <Box className="mx-auto box-border max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <Flex justify="between" align="center" wrap="wrap" gap="4">
              {/* Left: Copyright */}
              <Flex align="center" gap="2">
                <Text size="1" color="gray">
                  © 2026 Frpc Hub. All rights reserved.
                </Text>
              </Flex>

              {/* Center: Version & Author */}
              <Flex align="center" gap="4">
                <Flex align="center" gap="2">
                  <Text size="1" color="gray">
                    Version: <Text weight="medium">{appVersion ? `v${appVersion}` : "—"}</Text>
                  </Text>
                  {updateAvailable && releaseUrl && (
                    <a href={releaseUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                      <Flex
                        align="center"
                        gap="1"
                        className="rounded-md px-2 py-0.5 transition-colors hover:bg-[var(--amber-a3)]"
                        style={{ color: "var(--amber-11)" }}
                      >
                        <Icon icon="lucide:arrow-up-circle" width="12" height="12" />
                        <Text size="1" weight="medium">{latestVersion}</Text>
                      </Flex>
                    </a>
                  )}
                </Flex>
                <Flex align="center" gap="2">
                  <Text size="1" color="gray">
                    Author:
                  </Text>
                  <Link
                    to="https://github.com/luckjiawei/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-12 cursor-pointer no-underline transition-colors"
                    style={{
                      color: "var(--gray-11)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Avatar
                      size="1"
                      src="https://github.com/luckjiawei.png"
                      fallback="L"
                      radius="full"
                    />
                    <Text weight="medium" size="1">
                      liujiawei
                    </Text>
                  </Link>
                </Flex>
              </Flex>

              {/* Right: Links */}
              <Flex align="center" gap="4">
                <a
                  href="https://github.com/luckjiawei/frpc-hub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="no-underline"
                >
                  <Flex
                    align="center"
                    gap="1"
                    className="text-gray-500 transition-colors hover:text-gray-700"
                  >
                    <Icon icon="lucide:github" width="16" height="16" />
                    <Text size="1">Frpc Hub</Text>
                  </Flex>
                </a>
              </Flex>
            </Flex>
          </Box>
        </Box>
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Box
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{
            backgroundColor: "var(--color-background)",
            borderTop: "1px solid var(--gray-6)",
          }}
        >
          <Flex justify="between" align="center" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            {mobileBottomNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path} className="no-underline flex-1">
                  <Flex
                    direction="column"
                    align="center"
                    gap="1"
                    className="py-3"
                    style={{ color: isActive ? "var(--accent-11)" : "var(--gray-10)" }}
                  >
                    {item.icon}
                    <Text size="1" weight={isActive ? "bold" : "regular"}>
                      {t(item.labelKey)}
                    </Text>
                  </Flex>
                </Link>
              );
            })}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}

export default MainLayout;
