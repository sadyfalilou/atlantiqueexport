import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Briefcase,
  PackageCheck,
  TrendingUp,
  Truck,
} from "lucide-react";
import { getDashboard } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const figures = await getDashboard();

  return (
    <div>
      <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
        Tableau de bord
      </h1>
      <p className="mt-1 text-sm text-muted">
        Ce qui demande une action aujourd&apos;hui.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Virements à valider"
          value={figures.pendingPayment}
          href="/admin/commandes?paiement=pending"
          icon={<Banknote className="size-5" />}
          urgent={figures.pendingPayment > 0}
        />
        <Stat
          label="Demandes pro"
          value={figures.pendingBusiness}
          href="/admin/demandes-pro"
          icon={<Briefcase className="size-5" />}
          urgent={figures.pendingBusiness > 0}
        />
        <Stat
          label="Commandes à préparer"
          value={figures.toPrepare}
          href="/admin/commandes?statut=a-preparer"
          icon={<PackageCheck className="size-5" />}
        />
        <Stat
          label="Ramassages aujourd'hui"
          value={figures.todayPickups}
          href="/admin/commandes?reception=ramassage"
          icon={<PackageCheck className="size-5" />}
        />
        <Stat
          label="Livraisons aujourd'hui"
          value={figures.todayDeliveries}
          href="/admin/commandes?reception=livraison"
          icon={<Truck className="size-5" />}
        />
      </div>

      <section className="mt-8 rounded-lg border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
          <TrendingUp aria-hidden="true" className="size-5" />
          Ce qui se vend le mieux
        </h2>
        <p className="mt-1 text-sm text-muted">
          Formats les plus commandés sur {figures.topSellersDays} jours, commandes payées
          seulement.
        </p>

        {figures.topSellers.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Aucune vente payée sur la période. Le classement apparaîtra dès la première
            commande encaissée.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {figures.topSellers.map((item) => (
              <li key={item.sku}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold text-forest-900">
                    {item.name}{" "}
                    <span className="font-normal text-muted">{item.label}</span>
                  </span>
                  <span className="tabular shrink-0 text-sm text-forest-900">
                    {item.quantity} vendu{item.quantity > 1 ? "s" : ""} ·{" "}
                    {formatPrice(item.revenueCents, "fr")}
                  </span>
                </div>
                {/*
                  La barre se mesure au premier du classement : elle rend
                  l'écart lisible d'un coup d'œil, ce qu'une colonne de nombres
                  ne fait pas. Purement décorative, d'où l'absence de rôle.
                */}
                <div
                  aria-hidden="true"
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-100"
                >
                  <div
                    className="h-full rounded-full bg-forest-800"
                    style={{
                      width: `${Math.round(
                        (item.quantity / figures.topSellers[0].quantity) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-semibold text-forest-900">
            Encaissé
          </h2>
          <p className="tabular mt-2 font-display text-[2rem] font-semibold text-forest-900">
            {formatPrice(figures.paidRevenueCents, "fr")}
          </p>
          <p className="mt-1 text-sm text-muted">
            Somme des commandes dont le paiement est confirmé. Les commandes en attente de
            virement n&apos;y figurent pas.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-semibold text-forest-900">
            Stocks faibles
          </h2>
          {figures.lowStock.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Aucun format sous son seuil d&apos;alerte.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {figures.lowStock.map((item) => (
                <li key={item.sku} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-forest-900">
                      {item.name}
                    </span>
                    <span className="block text-xs text-muted">{item.sku}</span>
                  </span>
                  <span className="tabular inline-flex shrink-0 items-center gap-1.5 font-semibold text-warning">
                    <AlertTriangle aria-hidden="true" className="size-4" />
                    {item.available} / {item.threshold}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  icon,
  urgent = false,
}: {
  label: string;
  value: number;
  href?: string;
  icon: React.ReactNode;
  urgent?: boolean;
}) {
  const content = (
    <div
      className={`rounded-lg border bg-surface p-5 transition-shadow ${
        urgent ? "border-mango-700" : "border-line"
      } ${href ? "hover:shadow-md" : ""}`}
    >
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p
        className={`tabular mt-2 font-display text-[2rem] font-semibold ${
          urgent ? "text-mango-800" : "text-forest-900"
        }`}
      >
        {value}
      </p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
