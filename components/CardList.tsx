
import React, { useState, useEffect } from 'react';
import type { BusinessCard } from '../types';
import { listenForCards, deleteCard } from '../services/contactService';
import CardItem from './CardItem';
import EditCardForm from './EditCardForm';
import Modal from './Modal';
import Spinner from './Spinner';

interface CardListProps {
    currentUser: string;
}

const CardList: React.FC<CardListProps> = ({ currentUser }) => {
    const [allCards, setAllCards] = useState<BusinessCard[]>([]);
    const [filteredCards, setFilteredCards] = useState<BusinessCard[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<string>('all');
    const [availableUsers, setAvailableUsers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCard, setEditingCard] = useState<BusinessCard | null>(null);
    const [deletingCard, setDeletingCard] = useState<BusinessCard | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = listenForCards((cards) => {
            setAllCards(cards);
            
            // Extract unique users from cards
            const users = Array.from(new Set(cards.map(card => card.createdBy).filter(Boolean))) as string[];
            setAvailableUsers(users.sort());
            
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        let filteredData = allCards;
        
        // Filter by user
        if (selectedUser !== 'all') {
            filteredData = filteredData.filter(item => item.createdBy === selectedUser);
        }
        
        // Filter by search term
        if (searchTerm) {
            filteredData = filteredData.filter(item =>
                (item.name_en && item.name_en.toLowerCase().includes(lowercasedFilter)) ||
                (item.name_th && item.name_th.toLowerCase().includes(lowercasedFilter)) ||
                item.company.toLowerCase().includes(lowercasedFilter)
            );
        }
        
        setFilteredCards(filteredData);
    }, [searchTerm, selectedUser, allCards]);

    const handleDelete = async () => {
        if (deletingCard && deletingCard.id) {
            await deleteCard(deletingCard.id);
            setDeletingCard(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center mt-20"><Spinner size="lg" /></div>;
    }

    if (editingCard) {
        return <EditCardForm initialData={editingCard} onCancel={() => setEditingCard(null)} />;
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8">
            <h1 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">My Contacts</h1>
            
            <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            ค้นหา
                        </label>
                        <input
                            type="text"
                            placeholder="ค้นหาจากชื่อหรือบริษัท..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            กรองตามผู้ใช้
                        </label>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">ทั้งหมด ({allCards.length})</option>
                            {availableUsers.map(user => {
                                const count = allCards.filter(card => card.createdBy === user).length;
                                return (
                                    <option key={user} value={user}>
                                        {user} ({count})
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>
                
                {(searchTerm || selectedUser !== 'all') && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            แสดง {filteredCards.length} จาก {allCards.length} รายการ
                        </p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedUser('all');
                            }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            ล้างตัวกรอง
                        </button>
                    </div>
                )}
            </div>
            
            {filteredCards.length > 0 ? (
                <div className="space-y-4">
                    {filteredCards.map(card => (
                        <CardItem
                            key={card.id}
                            card={card}
                            onEdit={() => setEditingCard(card)}
                            onDelete={() => setDeletingCard(card)}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-center text-slate-500 py-10">ไม่พบข้อมูลติดต่อ</p>
            )}

            {deletingCard && (
                <Modal
                    title="ลบข้อมูลติดต่อ"
                    message={`ต้องการลบข้อมูลติดต่อของ ${deletingCard.name_en || deletingCard.name_th} หรือไม่?`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeletingCard(null)}
                />
            )}
        </div>
    );
};

export default CardList;