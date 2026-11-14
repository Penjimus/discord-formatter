// Copie d'un texte dans le presse-papiers, partagée par le panneau droit et les messages découpés.

/** Méthode de secours quand le navigateur refuse l'accès direct au presse-papiers. */
function copyWithSelection(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** Copie le texte tel quel (ESC et U+200B compris) ; renvoie `false` si la copie a échoué. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyWithSelection(text);
  }
}
