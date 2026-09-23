import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { QuickAddModal } from './QuickAddModal';
import { extractSurroundingSentence } from '../../src/lib/sentence-extractor';
import { Plus } from '@keyline-icons/react';
import '../../src/assets/style.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    let currentSelection = '';
    let currentSentence = '';
    let floatingBtnVisible = false;
    let modalVisible = false;
    let floatingBtnPos = { x: 0, y: 0 };
    let triggerRender: (() => void) | null = null;

    // In-page Overlay Container rendered inside Shadow DOM
    function OverlayRoot() {
      const [, setTick] = useState(0);
      triggerRender = () => setTick((t) => t + 1);

      const [isDark, setIsDark] = useState(false);

      useEffect(() => {
        const updateTheme = () => {
          try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
              chrome.storage.local.get(['vocab_theme'], (res) => {
                if (res.vocab_theme === 'dark') {
                  setIsDark(true);
                } else if (res.vocab_theme === 'light') {
                  setIsDark(false);
                } else {
                  setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
                }
              });
            } else {
              setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
          } catch {
            setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
          }
        };

        updateTheme();

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = () => updateTheme();
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
      }, []);

      const handleOpenModal = () => {
        floatingBtnVisible = false;
        modalVisible = true;
        triggerRender?.();
      };

      const handleCloseModal = () => {
        modalVisible = false;
        triggerRender?.();
      };

      return (
        <div style={{ position: 'relative', zIndex: 2147483647 }}>
          {/* Floating Save Tooltip Button */}
          {floatingBtnVisible && !modalVisible && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenModal();
              }}
              className="fixed z-[2147483647] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-semibold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer border border-primary/20"
              style={{
                left: `${floatingBtnPos.x}px`,
                top: `${floatingBtnPos.y}px`,
                transform: 'translate(-50%, -100%) translateY(-8px)',
              }}
            >
              <Plus className="h-3 w-3" />
              <span>Save Word</span>
            </button>
          )}

          {/* Quick Add Modal */}
          {modalVisible && (
            <QuickAddModal
              initialWord={currentSelection}
              initialSentence={currentSentence}
              sourceUrl={window.location.href}
              onClose={handleCloseModal}
              isDark={isDark}
            />
          )}
        </div>
      );
    }

    // Mount shadow root UI
    const ui = await createShadowRootUi(ctx, {
      name: 'vocabulary-capture-root',
      position: 'overlay',
      anchor: 'body',
      append: 'last',
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(<OverlayRoot />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();

    // Selection detection
    const handleMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() || '';

        // If user highlighted text between 1 and 80 characters
        if (text && text.length >= 1 && text.length <= 80 && sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // Only show if selection is visible
          if (rect.width > 0 && rect.height > 0) {
            currentSelection = text;
            currentSentence = extractSurroundingSentence(sel);
            floatingBtnPos = {
              x: rect.left + rect.width / 2,
              y: Math.max(10, rect.top),
            };
            floatingBtnVisible = true;
            triggerRender?.();
            return;
          }
        }

        // Hide floating button if no valid selection
        if (floatingBtnVisible) {
          floatingBtnVisible = false;
          triggerRender?.();
        }
      }, 50);
    };

    // Close floating button on mousedown outside
    const handleMouseDown = (e: MouseEvent) => {
      // Don't close if clicking inside our shadow root
      if (ui.shadow && ui.shadow.contains(e.target as Node)) {
        return;
      }
      if (floatingBtnVisible) {
        floatingBtnVisible = false;
        triggerRender?.();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    // Context menu message listener from background worker
    chrome.runtime.onMessage.addListener((message: unknown) => {
      const msg = message as { action?: string; selectedText?: string };
      if (msg?.action === 'OPEN_QUICK_ADD') {
        currentSelection = msg.selectedText || window.getSelection()?.toString().trim() || '';
        currentSentence = extractSurroundingSentence(window.getSelection());
        floatingBtnVisible = false;
        modalVisible = true;
        triggerRender?.();
      }
    });
  },
});
