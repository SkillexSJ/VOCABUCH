/**
 * Helper to extract the full sentence surrounding a selected text within an element.
 */
export function extractSurroundingSentence(selection: Selection | null): string {
  if (!selection || selection.rangeCount === 0) return '';

  const selectedText = selection.toString().trim();
  if (!selectedText) return '';

  const range = selection.getRangeAt(0);
  let container: Node | null = range.commonAncestorContainer;

  // If text node, grab parent element
  if (container.nodeType === Node.TEXT_NODE && container.parentElement) {
    container = container.parentElement;
  }

  const fullText = container.textContent || '';
  if (!fullText) return selectedText;

  // Locate the selected text inside the container's text
  const selectIndex = fullText.indexOf(selectedText);
  if (selectIndex === -1) return selectedText;

  // Search backwards for the start of the sentence
  let startIndex = 0;
  for (let i = selectIndex - 1; i >= 0; i--) {
    const char = fullText[i];
    if (char === '.' || char === '!' || char === '?' || char === '\n') {
      startIndex = i + 1;
      break;
    }
  }

  // Search forwards for the end of the sentence
  let endIndex = fullText.length;
  for (let i = selectIndex + selectedText.length; i < fullText.length; i++) {
    const char = fullText[i];
    if (char === '.' || char === '!' || char === '?' || char === '\n') {
      endIndex = i + 1;
      break;
    }
  }

  const sentence = fullText.slice(startIndex, endIndex).trim();
  // Return cleaned sentence if it contains the word and is reasonably sized
  if (sentence.length >= selectedText.length && sentence.length < 500) {
    return sentence.replace(/^["'„“»«\s]+|["'„“»«\s]+$/g, '').trim();
  }

  return selectedText;
}
