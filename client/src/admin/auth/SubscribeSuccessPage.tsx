import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Retour après paiement Stripe réussi. Le compte est matérialisé par le webhook (asynchrone) :
 * on invite l'utilisateur à se connecter (email/mot de passe ou Google selon son choix).
 */
export function SubscribeSuccessPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" className="h-10" />
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Paiement reçu 🎉
          </span>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Merci ! Votre abonnement est actif et votre espace est en cours de création (quelques
              secondes).
            </div>
            <p className="text-sm text-muted-foreground">
              Connectez-vous avec l'identité choisie lors de l'inscription (email + mot de passe, ou
              Google) pour accéder à votre organisation.
            </p>
            <Button asChild>
              <Link to="/admin/login">Se connecter</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
