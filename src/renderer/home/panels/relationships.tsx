import React, { useState, useContext } from 'react';
import { InputGroup, Button, ITreeNode, Tree } from '@blueprintjs/core';
import { callIPC } from 'coulomb/ipc/renderer';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { ConceptRef, MultiLanguageConcept, ConceptRelation } from 'models/concepts';

import {
  ConceptContext,
  ConceptRelationshipsContextProvider,
  ConceptRelationshipsContext,
} from '../contexts';

import { LazyConceptItem } from '../concepts';
import { availableLanguages } from 'app';
import { PanelConfig } from '../panel-config';

import styles from './relationships.scss';
import sharedStyles from '../styles.scss';


const DEFAULT_RELATIONSHIP_TYPE = 'related';


const Panel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);

  const [newLinkTarget, setNewLinkTarget] = useState<string>('');
  const [newLinkType, setNewLinkType] = useState<string>(DEFAULT_RELATIONSHIP_TYPE);
  const [addingLink, toggleAddingLink] = useState(false);
  const [commitInProgress, setCommitInProgress] = useState(false);

  function handleNewLinkChange(evt: React.FormEvent<HTMLInputElement>) {
    setNewLinkTarget((evt.target as HTMLInputElement).value.trim());
  }

  async function addNewLink() {
    let newLinkRef: number;
    try {
      newLinkRef = parseInt(newLinkTarget, 10);
    } catch (e) {
      return;
    }

    const existingRelations = concept.active?.relations || [];

    const alreadyExists =
      existingRelations.
      find(r => r.to === newLinkRef && r.type === newLinkType) !== undefined;

    if (newLinkRef !== concept.ref && alreadyExists === false && concept.ref && concept.active) {
      setCommitInProgress(true);

      const relations: ConceptRelation[] = [
        ...existingRelations,
        { to: newLinkRef, type: newLinkType },
      ];

      await callIPC
        <{ commit: boolean, objectID: number, object: MultiLanguageConcept<any> }, { success: true }>
        ('model-concepts-update-one', {
          objectID: concept.ref,
          object: { ...concept.active, relations },
          commit: true,
        });

      setNewLinkTarget('');
      setNewLinkType(DEFAULT_RELATIONSHIP_TYPE);
      setCommitInProgress(false);
      toggleAddingLink(false);
    }
  }

  async function handleRemoveOutgoingLink(type: string, to: ConceptRef) {
    toggleAddingLink(false);

    if (concept.ref && concept.active) {
      const existingRelations = concept.active.relations || [];

      const relations: ConceptRelation[] =
        existingRelations.filter(r => r.to !== to || r.type !== type);

      await callIPC
      <{ commit: boolean, objectID: number, object: MultiLanguageConcept<any> }, { success: true }>
      ('model-concepts-update-one', {
        objectID: concept.ref,
        object: { ...concept.active, relations },
        commit: true,
      });
    }
  }

  return (
    <>
      {addingLink
        ? <InputGroup small
            type="text"
            readOnly={commitInProgress}
            rightElement={
              <>
                <Button
                  small minimal intent="primary"
                  icon="tick-circle"
                  loading={commitInProgress}
                  disabled={newLinkTarget.trim() === ''}
                  onClick={addNewLink}
                  title="Commit new outgoing link" />
                <Button
                  small minimal
                  icon="cross"
                  onClick={() => toggleAddingLink(false)}
                  title="Cancel" />
              </>
            }
            onChange={handleNewLinkChange}
            value={newLinkTarget}
            placeholder="ID of concept to link"
          />
        : <Button
            small minimal fill
            icon="add"
            alignText="left"
            disabled={!concept.active}
            onClick={() => toggleAddingLink(true)}>Add link…</Button>}

      <ConceptRelationshipsContextProvider>
        <ConceptRelations
          onRemoveOutgoingLink={handleRemoveOutgoingLink}
          onConceptSelect={(ref: ConceptRef) => concept.select(ref)}/>
      </ConceptRelationshipsContextProvider>
    </>
  );
};


interface ConceptRelationsProps {
  onRemoveOutgoingLink: (relationType: string, relationTarget: ConceptRef) => void
  onConceptSelect: (ref: ConceptRef) => void
}
const ConceptRelations: React.FC<ConceptRelationsProps> =
function ({ onRemoveOutgoingLink, onConceptSelect }) {
  const ctx = useContext(ConceptRelationshipsContext);
  const lang = useContext(LangConfigContext);

  const nodesLinksTo: ITreeNode[] = ctx.linksTo.map(r => ({
    id: r.to,
    hasCaret: false,
    label: <LazyConceptItem
      lang={lang.selected as keyof typeof availableLanguages}
      conceptRef={r.to} />,
    icon: <span className={`${sharedStyles.conceptID} ${styles.conceptID}`}>{r.to}</span>,
    secondaryLabel:
      <Button small minimal
        onClick={(evt: React.FormEvent) => {
          evt.preventDefault();
          evt.stopPropagation();
          onRemoveOutgoingLink(r.type, r.to);
        }}
        icon="cross" />,
    nodeData: {
      type: r.type,
      to: r.to,
      ref: r.to,
    },
  }));

  const nodesLinkedFrom: ITreeNode[] = ctx.linkedFrom.map(r => ({
    id: r.from,
    hasCaret: false,
    icon: <span className={`${sharedStyles.conceptID} ${styles.conceptID}`}>{r.from}</span>,
    label: <LazyConceptItem
      lang={lang.selected as keyof typeof availableLanguages}
      conceptRef={r.from} />,
    secondaryLabel:
      <Button disabled small minimal icon="cross" />,
    nodeData: {
      ref: r.from,
    },
  }));

  var nodes: ITreeNode[] = []
  if (nodesLinksTo.length > 0) {
    nodes.push({
      id: 'outgoing',
      label: "Links to",
      hasCaret: true,
      isExpanded: true,
      childNodes: nodesLinksTo,
    });
  }
  if (nodesLinkedFrom.length > 0) {
    nodes.push({
      id: 'incoming',
      label: "Linked from",
      hasCaret: true,
      isExpanded: true,
      childNodes: nodesLinkedFrom,
    });
  }

  function handleNodeClick(nodeData: ITreeNode) {
    const data = nodeData.nodeData as { ref: ConceptRef };
    onConceptSelect(data.ref);
  }

  return (
    <Tree contents={nodes} onNodeClick={handleNodeClick} />
  );
};


export default {
  Contents: Panel,
  title: "Relationships",
} as PanelConfig;