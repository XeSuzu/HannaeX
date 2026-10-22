"use client";

import Link from "next/link";
import { NavigationMenu } from "@base-ui/react/navigation-menu";

const links = [
  ["#sobre-hoshiko", "Sobre Hoshiko"],
  ["#galeria", "Galería"],
  ["#funciones", "Funciones"],
  ["#moderacion", "Moderación"],
] as const;

export function ExternalNavigationMenu() {
  return (
    <NavigationMenu.Root className="external-navigation">
      <NavigationMenu.List className="external-navigation-list">
        {links.map(([href, label]) => (
          <NavigationMenu.Item key={href}>
            <NavigationMenu.Link render={<Link href={href} />} className="external-navigation-link">
              {label}
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
