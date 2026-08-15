"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderTree,
  LayoutDashboard,
  Package,
  Briefcase,
  Ship,
  Store,
  Tag,
  Truck,
} from "lucide-react";

/**
 * Navigation de l'administration.
 *
 * Onze destinations à plat débordaient sur deux lignes et ne disaient jamais
 * où l'on se trouve. Elles sont regroupées par métier — ce qu'on vend, ce
 * qu'on expédie, ce qu'on écrit — et la section courante est marquée.
 *
 * Les deux gestes du quotidien, les commandes et les demandes en attente,
 * restent au premier niveau : les enfouir dans un menu ajouterait un clic à ce
 * qu'on fait vingt fois par jour.
 */

const ICONS = {
  dashboard: LayoutDashboard,
  orders: ClipboardList,
  business: Briefcase,
  products: Tag,
  categories: FolderTree,
  brands: Store,
  recipes: BookOpen,
  stock: Package,
  shipments: Ship,
  delivery: Truck,
  pages: FileText,
} as const;

type IconName = keyof typeof ICONS;

interface Item {
  href: string;
  label: string;
  icon: IconName;
}

const DIRECT: Item[] = [
  { href: "/admin", label: "Tableau de bord", icon: "dashboard" },
  { href: "/admin/commandes", label: "Commandes", icon: "orders" },
  { href: "/admin/demandes-pro", label: "Demandes pro", icon: "business" },
];

const GROUPS: Array<{ label: string; items: Item[] }> = [
  {
    label: "Catalogue",
    items: [
      { href: "/admin/produits", label: "Produits", icon: "products" },
      { href: "/admin/categories", label: "Catégories", icon: "categories" },
      { href: "/admin/marques", label: "Marques", icon: "brands" },
    ],
  },
  {
    label: "Logistique",
    items: [
      { href: "/admin/stocks", label: "Stocks", icon: "stock" },
      { href: "/admin/arrivages", label: "Arrivages", icon: "shipments" },
      { href: "/admin/livraison", label: "Livraison", icon: "delivery" },
    ],
  },
  {
    label: "Contenu",
    items: [
      { href: "/admin/pages", label: "Pages", icon: "pages" },
      { href: "/admin/recettes", label: "Recettes", icon: "recipes" },
    ],
  },
];

/**
 * `/admin` ne doit s'allumer que sur lui-même : sans ce cas particulier, il
 * resterait actif sur toutes les pages de l'administration, qui commencent
 * toutes par ce chemin.
 */
function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Icon({ name }: { name: IconName }) {
  const Component = ICONS[name];
  return <Component aria-hidden="true" className="size-4" />;
}

export function AdminNav() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Un menu ouvert se referme au clic ailleurs et à la touche Échap. Sans
  // cela, il resterait ouvert par-dessus la page qu'on vient d'atteindre.
  useEffect(() => {
    if (openGroup === null) return;

    function onPointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpenGroup(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroup(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  const linkClass = (active: boolean) =>
    `inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors ${
      active ? "bg-forest-700 text-white" : "hover:bg-forest-800"
    }`;

  return (
    <nav
      ref={navRef}
      aria-label="Administration"
      className="flex flex-wrap items-center gap-1"
    >
      {DIRECT.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={linkClass(isActive(pathname, item.href))}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}

      {GROUPS.map((group) => {
        const groupActive = group.items.some((item) => isActive(pathname, item.href));
        const open = openGroup === group.label;

        return (
          <div key={group.label} className="relative">
            <button
              type="button"
              onClick={() => setOpenGroup(open ? null : group.label)}
              aria-expanded={open}
              className={linkClass(groupActive)}
            >
              {group.label}
              <ChevronDown
                aria-hidden="true"
                className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open ? (
              <ul className="absolute top-full left-0 z-20 mt-1 min-w-52 rounded-lg border border-forest-700 bg-forest-900 p-1 shadow-lg">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      // Refermé au clic plutôt qu'en réagissant au changement
                      // d'adresse : ce composant vit dans le gabarit et n'est
                      // pas démonté par la navigation, le menu resterait donc
                      // ouvert par-dessus la page atteinte.
                      onClick={() => setOpenGroup(null)}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className={`flex h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${
                        isActive(pathname, item.href)
                          ? "bg-forest-700 text-white"
                          : "hover:bg-forest-800"
                      }`}
                    >
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
