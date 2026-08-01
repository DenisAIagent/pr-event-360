import { useState } from 'react';
import { Mail, Send, Trash2, Users2 } from 'lucide-react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import { useToast } from '../Toast';
import { useConfirm } from '../Confirm';
import { EmptyState } from '../EmptyState';

export interface ProductionContact {
  id: string;
  name: string;
  email: string;
  tokenExpiresAt: string | null;
  lastSentAt: string | null;
  artistIds: string[];
}

interface ArtistOption {
  id: string;
  name: string;
}

const EMPTY = { name: '', email: '', artistIds: [] as string[] };

/**
 * Contacts production d'un événement : qui représente quels artistes, et envoi
 * du lien de validation. Composant séparé de `LineupTab`, qui frôle déjà la
 * limite de taille de fichier du projet.
 */
export function ProductionContacts({ eventId, artists }: { eventId: string; artists: ArtistOption[] }) {
  const api = useAuthedApi();
  const toast = useToast();
  const confirm = useConfirm();
  const contacts = useFetch<ProductionContact[]>(
    () => api.get<ProductionContact[]>(`/admin/events/${eventId}/production-contacts`),
    [eventId],
  );
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const canSubmit = form.name.trim() && form.email.trim() && form.artistIds.length > 0 && !busy;

  async function create() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await api.post(`/admin/events/${eventId}/production-contacts`, {
        name: form.name.trim(),
        email: form.email.trim(),
        artistIds: form.artistIds,
      });
      setForm(EMPTY);
      contacts.reload();
      toast.success('Contact ajouté');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ajout impossible');
    } finally {
      setBusy(false);
    }
  }

  async function sendLink(c: ProductionContact) {
    try {
      await api.post(`/admin/events/${eventId}/production-contacts/${c.id}/send-link`, {});
      contacts.reload();
      toast.success(`Lien envoyé à ${c.email}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Envoi impossible');
    }
  }

  async function remove(c: ProductionContact) {
    const ok = await confirm({
      title: 'Supprimer ce contact ?',
      message: `${c.name} perdra l’accès à l’espace de validation. Les avis déjà donnés sont conservés.`,
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/events/${eventId}/production-contacts/${c.id}`);
      contacts.reload();
      toast.success('Contact supprimé');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression impossible');
    }
  }

  const toggleArtist = (id: string) =>
    setForm((f) => ({
      ...f,
      artistIds: f.artistIds.includes(id) ? f.artistIds.filter((a) => a !== id) : [...f.artistIds, id],
    }));

  const artistName = (id: string) => artists.find((a) => a.id === id)?.name ?? '—';

  return (
    <section className="card stack">
      <div>
        <h3 style={{ margin: 0 }}>Contacts production</h3>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          Chaque contact reçoit un lien personnel pour donner son avis sur les demandes adressées à ses
          artistes. Vous gardez la décision finale.
        </p>
      </div>

      {contacts.data && contacts.data.length === 0 && (
        <EmptyState
          icon={Users2}
          title="Aucun contact production"
          hint="Ajoutez le manager ou la production d’un artiste pour lui faire valider les demandes d’interview."
        />
      )}

      {contacts.data && contacts.data.length > 0 && (
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {contacts.data.map((c) => (
            <li
              key={c.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
                borderTop: '1px solid var(--color-line)',
                paddingTop: 'var(--space-3)',
              }}
            >
              <div>
                <strong>{c.name}</strong> <span className="muted">· {c.email}</span>
                <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                  {c.artistIds.map(artistName).join(', ') || 'Aucun artiste rattaché'}
                  {c.lastSentAt && ` · lien envoyé le ${new Date(c.lastSentAt).toLocaleDateString('fr-FR')}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => sendLink(c)}>
                  <Send size={15} /> {c.lastSentAt ? 'Renvoyer le lien' : 'Envoyer le lien'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(c)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="stack" style={{ borderTop: '1px solid var(--color-line)', paddingTop: 'var(--space-4)' }}>
        <div className="row">
          <div className="field">
            <label htmlFor="pc-name">Nom du contact</label>
            <input
              id="pc-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="pc-email">Email</label>
            <input
              id="pc-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
        </div>
        <div className="field">
          <label>Artistes représentés</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {artists.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`btn btn-sm ${form.artistIds.includes(a.id) ? 'btn-primary' : 'btn-ghost'}`}
                aria-pressed={form.artistIds.includes(a.id)}
                onClick={() => toggleArtist(a.id)}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={create}>
          <Mail size={16} /> Ajouter le contact
        </button>
      </div>
    </section>
  );
}
