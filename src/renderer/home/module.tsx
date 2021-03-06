import React, { useState, useContext, useMemo, useEffect } from 'react';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { ObjectSource, availableLanguages } from 'app';
import { MultiLanguageConcept, ConceptRef } from 'models/concepts';
import { app } from 'renderer';
import { ConceptContext, SourceContext, TextSearchContext } from './contexts';
import { ModuleConfig } from './module-config';
import { Sidebar } from './module-sidebar';
import styles from './styles.scss';


type ModuleProps = Omit<Omit<ModuleConfig, 'title'>, 'hotkey'>;
export const Module: React.FC<ModuleProps> = function ({ leftSidebar, rightSidebar, MainView, mainToolbar }) {
  const lang = useContext(LangConfigContext);

  const [selectedConceptRef, selectConceptRef] = useState(null as null | ConceptRef);
  const [activeSource, selectSource] = useState({ type: 'catalog-preset', presetName: 'all' } as ObjectSource);
  const [textQuery, setTextQuery] = useState('' as string);

  const _objs = app.useMany<MultiLanguageConcept<any>, { query: { inSource: ObjectSource, matchingText?: string }}>
  ('concepts', { query: { inSource: activeSource, matchingText: textQuery }});

  const concepts = {
    ids: app.useIDs<number, { query: { inSource: ObjectSource }}>
      ('concepts', { query: { inSource: activeSource }}).ids,
    objects: Object.values(_objs.objects).sort((a, b) => a.termid - b.termid),
  };

  // One-off collection migration call
  //const collectionsMigrated = useRef({ yes: false });
  //useEffect(() => {
  //  if (concepts.ids.length > 0 && collectionsMigrated.current.yes !== true) {
  //    callIPC('initialize-standards-collections');
  //    collectionsMigrated.current.yes = true;
  //  }
  //}, [concepts.ids.length]);


  // Hotkey navigation up/down concept roll
  const currentIndex = useMemo(() => (
    concepts.objects.findIndex((c) => c.termid === selectedConceptRef)
  ), [JSON.stringify(concepts.ids), JSON.stringify(activeSource), selectedConceptRef]);

  useEffect(() => {
    function selectNext() {
      const ref = getNextRef(currentIndex);
      if (ref) { selectConceptRef(ref); }
    }
    function selectPrevious() {
      const ref = getPreviousRef(currentIndex);
      if (ref) { selectConceptRef(ref); }
    }
    function getNextRef(idx?: number): ConceptRef | undefined {
      if (idx !== undefined && concepts.objects[idx + 1]) {
        return concepts.objects[idx + 1].termid;
      }
      return undefined;
    }
    function getPreviousRef(idx?: number): ConceptRef | undefined  {
      if (idx !== undefined && idx >= 1 && concepts.objects[idx - 1]) {
        return concepts.objects[idx - 1].termid;
      }
      return undefined;
    }

    Mousetrap.bind('j', selectNext);
    Mousetrap.bind('k', selectPrevious);

    return function cleanup() {
      Mousetrap.unbind('j');
      Mousetrap.unbind('k');
    };
  }, [currentIndex]);

  const concept = selectedConceptRef
    ? (_objs.objects[selectedConceptRef] || null)
    : null; 
  const localizedConcept = concept
    ? (concept[lang.selected as keyof typeof availableLanguages] || null)
    : undefined;

  return (
    <ConceptContext.Provider
        value={{
          active: concept,
          isLoading: _objs.isUpdating,
          activeLocalized: localizedConcept,
          ref: selectedConceptRef,
          select: selectConceptRef,
        }}>
      <SourceContext.Provider
          value={{
            active: activeSource,
            select: selectSource,
            refs: concepts.ids,
            objects: concepts.objects,
            index: _objs.objects,
            isLoading: _objs.isUpdating,
          }}>
        <TextSearchContext.Provider value={{ query: textQuery, setQuery: setTextQuery }}>

          <div className={styles.moduleView}>
            {leftSidebar.length > 0
              ? <Sidebar key="left" position="left" panelSet={leftSidebar} />
              : null}

            <div key="main" className={styles.moduleMainView}>
              <MainView />

              <div className={styles.moduleToolbar}>
                {[...mainToolbar.entries()].map(([idx, El]) => <El key={idx} />)}
              </div>
            </div>

            {rightSidebar.length > 0
              ? <Sidebar key="right" position="right" panelSet={rightSidebar} />
              : null}
          </div>

        </TextSearchContext.Provider>
      </SourceContext.Provider>
    </ConceptContext.Provider>
  );
};
