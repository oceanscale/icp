import React, { useState } from 'react';
import { Button } from '../ds/index.jsx';
import { api } from '../lib/api.js';
import Board from './Board.jsx';
import CopyButton from './CopyButton.jsx';
import Modal from './Modal.jsx';
import TaskModal from './TaskModal.jsx';

/** Quadro do time dentro do caso: o gestor delega e compartilha; o responsável move os próprios cartões. */
export default function CaseBoard({ data, onUpdate }) {
  const [open, setOpen] = useState(null);
  const [share, setShare] = useState(false);
  const [error, setError] = useState('');
  const pid = data.project.id;
  const isGestor = data.me.projectRole === 'gestor';
  const people = Object.fromEntries(data.members.map((m) => [m.id, { name: m.name, avatar_at: m.avatar_at }]));
  for (const [id, name] of Object.entries(data.names || {})) people[id] ||= { name, avatar_at: data.avatars?.[id] };
  const shareLink = data.board.shareToken ? `${window.location.origin}/#/quadro/${data.board.shareToken}` : '';

  const act = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
  };
  const move = (card, status) =>
    act(async () => onUpdate(await api(`/projects/${pid}/lines/${card.line_id}/tasks/${card.mission_id}`, { method: 'PUT', body: { status } })));
  const current = open && data.board.cards.find((c) => c.line_id === open.line_id && c.mission_id === open.mission_id);

  return (
    <div className="case-board">
      <div className="case-board-intro">
        <div>
          <h2 className="dq-case-title" style={{ fontSize: 26, lineHeight: '32px' }}>
            Quadro do time
          </h2>
          <p className="muted small">
            Cada item do checklist do playbook vira uma evidência no mural. {isGestor ? 'Clique num cartão para delegar, dar prazo ou gerar o link para alguém assumir.' : 'Arraste os cartões que estão com você ou abra para ajustar o prazo.'}
          </p>
        </div>
        {isGestor ? (
          <Button variant="quiet" size="sm" onClick={() => setShare(true)}>
            Compartilhar quadro
          </Button>
        ) : null}
      </div>
      {error ? <p className="error-text">{error}</p> : null}

      <Board
        cards={data.board.cards}
        people={people}
        meId={data.me.id}
        canMove={(card) => isGestor || card.assignee_id === data.me.id}
        onMove={move}
        onOpen={setOpen}
      />

      {current ? <TaskModal data={data} card={current} onClose={() => setOpen(null)} onUpdate={onUpdate} /> : null}

      {share ? (
        <Modal title="Compartilhar o quadro" onClose={() => setShare(false)}>
          <div className="stack-3">
            <p>Quem tiver o link vê o quadro, as fotos e os primeiros nomes do time, sem login e sem poder mexer. Bom para deixar aberto numa TV da sala ou mandar no grupo do time.</p>
            {shareLink ? (
              <>
                <code className="link-box">{shareLink}</code>
                <div className="row-3">
                  <CopyButton text={shareLink} label="Copiar link" />
                  <a className="dq-btn dq-btn-quiet dq-btn-sm" href={shareLink} target="_blank" rel="noreferrer">
                    Abrir
                  </a>
                  <Button variant="quiet" size="sm" onClick={() => act(async () => onUpdate(await api(`/projects/${pid}/quadro`, { method: 'POST' })))}>
                    Trocar link
                  </Button>
                  <Button variant="quiet" size="sm" onClick={() => act(async () => onUpdate(await api(`/projects/${pid}/quadro`, { method: 'DELETE' })))}>
                    Desligar
                  </Button>
                </div>
                <p className="small muted">Trocar ou desligar faz o link antigo parar de funcionar na hora.</p>
              </>
            ) : (
              <Button onClick={() => act(async () => onUpdate(await api(`/projects/${pid}/quadro`, { method: 'POST' })))}>Gerar link só de visualização</Button>
            )}
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
