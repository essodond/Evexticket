import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  onSave?: (user: any) => void;
}

const UserDetailsModal: React.FC<Props> = ({ isOpen, onClose, user, onSave }) => {
  const [form, setForm] = useState<any>(user || {});

  React.useEffect(() => {
    setForm(user || {});
  }, [user]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Détails utilisateur</h3>
          <button onClick={onClose} className="text-gray-600">Fermer</button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nom</label>
            <input className="mt-1 block w-full border rounded p-2" value={form.firstName || ''} onChange={e => setForm({...form, firstName: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input className="mt-1 block w-full border rounded p-2" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Téléphone</label>
            <input className="mt-1 block w-full border rounded p-2" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
          </div>
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">Actif</label>
            <input type="checkbox" checked={!!form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 border rounded">Annuler</button>
          <button onClick={() => onSave && onSave(form)} className="px-4 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
