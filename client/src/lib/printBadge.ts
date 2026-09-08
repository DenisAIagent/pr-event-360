import { buildBadgeHtml, type BadgeContent } from '@pr-event-360/core';
import { openPrintWindow } from './printDocument';

/**
 * Ouvre le badge d'un journaliste dans une fenêtre et lance l'impression.
 *
 * Le HTML est assemblé par `buildBadgeHtml` (core) : toutes les valeurs — nom,
 * média, événement — y sont échappées, le document porte une CSP `default-src
 * 'none'` et ne contient aucun `<script>`. C'est le correctif de la XSS stockée
 * X-01/X-02 : ces champs viennent du formulaire public d'accréditation et ne
 * sont plus injectés bruts dans un `document.write`.
 *
 * Renvoie `false` si le popup a été bloqué, pour que l'appelant prévienne.
 */
export function printBadge(badge: BadgeContent): boolean {
  return openPrintWindow(buildBadgeHtml(badge), 'width=360,height=520');
}
