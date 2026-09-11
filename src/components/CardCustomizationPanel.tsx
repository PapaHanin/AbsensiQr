import React, { useState } from 'react';
import {
  CardCustomizationOptions,
  CARD_PRESET_TEMPLATES,
} from '../utils/cardCustomization';
import { CardTemplateId } from '../types';

interface CardCustomizationPanelProps {
  options: CardCustomizationOptions;
  onChange: (newOptions: CardCustomizationOptions) => void;
  isAdmin?: boolean;
  onSetDefaultTemplate?: (templateId: CardTemplateId) => void;
  currentDefaultTemplate?: CardTemplateId;
}

export const CardCustomizationPanel: React.FC<CardCustomizationPanelProps> = ({
  options,
  onChange,
  isAdmin = false,
  onSetDefaultTemplate,
  currentDefaultTemplate,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const currentTemplate: CardTemplateId = options.templateId || currentDefaultTemplate || 'navy_gold';

  const handleTemplateSelect = (templateId: CardTemplateId) => {
    onChange({
      ...options,
      templateId,
    });
  };

  const activeTpl = CARD_PRESET_TEMPLATES[currentTemplate] || CARD_PRESET_TEMPLATES.navy_gold;

  return (
    <div className="bg-slate-50/95 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 shrink-0 no-print">
      {/* Header & Toggle Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shadow-xs">
            <i className="fa-solid fa-id-card"></i>
          </div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
              Desain Kartu:
            </h4>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
              <span
                className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0"
                style={{ backgroundColor: activeTpl.primaryHex }}
              />
              <span className="truncate max-w-[200px]">{activeTpl.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && onSetDefaultTemplate && (
            <button
              type="button"
              onClick={() => onSetDefaultTemplate(currentTemplate)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              title="Simpan desain yang dipilih sebagai default cetak seluruh sekolah"
            >
              <i className="fa-solid fa-star text-amber-300 text-[10px]"></i>
              <span>Jadikan Default</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title={isExpanded ? 'Perkecil panel opsi agar layar pratinjau lebih luas' : 'Buka pilihan 3 template desain'}
          >
            <span>{isExpanded ? 'Sembunyikan Pilihan' : 'Ganti Desain (3 Model)'}</span>
            <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`}></i>
          </button>
        </div>
      </div>

      {/* 3 Model Template Cards (Only 3 Unique Templates, Compact Height) */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          {(['navy_gold', 'emerald_gold', 'modern_minimalis'] as CardTemplateId[]).map((tplId) => {
            const tpl = CARD_PRESET_TEMPLATES[tplId];
            if (!tpl) return null;
            const isSelected = currentTemplate === tplId;
            const isDefault = currentDefaultTemplate === tplId;

            return (
              <div
                key={tplId}
                onClick={() => handleTemplateSelect(tplId)}
                className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-indigo-600 shadow-sm ring-1 ring-indigo-500/20'
                    : 'bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 border-slate-200 dark:border-slate-750'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tpl.primaryHex }}
                    />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 truncate">
                      {tpl.category}
                    </span>
                  </div>
                  {isDefault && (
                    <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 shrink-0">
                      Default
                    </span>
                  )}
                </div>

                <div className="my-0.5">
                  <h5 className="text-[11px] font-black text-slate-900 dark:text-white leading-snug line-clamp-1">
                    {tpl.name}
                  </h5>
                  <p className="text-[9.5px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {tpl.tagline}
                  </p>
                </div>

                {/* Color Swatch Bar */}
                <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <span
                      className="w-3.5 h-3.5 rounded shadow-xs border border-white shrink-0"
                      style={{ backgroundColor: tpl.primaryHex }}
                      title="Warna Utama"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded shadow-xs border border-white shrink-0"
                      style={{ backgroundColor: tpl.secondaryHex }}
                      title="Warna Aksen"
                    />
                    <span className="text-[9px] text-slate-500 font-mono ml-0.5 truncate">
                      {tpl.colorLabel}
                    </span>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border border-slate-300 text-transparent'
                    }`}
                  >
                    <i className="fa-solid fa-check"></i>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
