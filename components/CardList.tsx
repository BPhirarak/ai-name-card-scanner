
import React, { useState, useEffect } from 'react';
import type { BusinessCard } from '../types';
import { listenForCards, deleteCard, listenForUsers, shareCards } from '../services/contactService';
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
    
    // Share feature states
    const [isShareMode, setIsShareMode] = useState(false);
    const [selectedCards, setSelectedCards] = useState<string[]>([]);
    const [allUsers, setAllUsers] = useState<string[]>([]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [selectedShareUsers, setSelectedShareUsers] = useState<string[]>([]);
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        setLoading(true);
        const unsubscribeCards = listenForCards((cards) => {
            setAllCards(cards);
            
            // Extract unique users from cards
            const users = Array.from(new Set(cards.map(card => card.createdBy).filter(Boolean))) as string[];
            setAvailableUsers(users.sort());
            
            setLoading(false);
        });
        
        const unsubscribeUsers = listenForUsers((users) => {
            // Filter out current user from the list
            setAllUsers(users.filter(user => user !== currentUser));
        });
        
        return () => {
            unsubscribeCards();
            unsubscribeUsers();
        };
    }, [currentUser]);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        let filteredData = allCards;
        
        // First filter to show only cards created by current user or shared with current user
        filteredData = filteredData.filter(item => 
            item.createdBy === currentUser || 
            (item.sharedWith && item.sharedWith.includes(currentUser))
        );
        
        // Filter by user (for display purposes)
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
    }, [searchTerm, selectedUser, allCards, currentUser]);

    const handleDelete = async () => {
        if (deletingCard && deletingCard.id) {
            await deleteCard(deletingCard.id);
            setDeletingCard(null);
        }
    };

    const handleCardSelect = (cardId: string) => {
        setSelectedCards(prev => 
            prev.includes(cardId) 
                ? prev.filter(id => id !== cardId)
                : [...prev, cardId]
        );
    };

    const handleShareModeToggle = () => {
        setIsShareMode(!isShareMode);
        setSelectedCards([]);
    };

    const handleOpenShareModal = () => {
        if (selectedCards.length === 0) {
            alert('กรุณาเลือกการ์ดที่ต้องการแชร์');
            return;
        }
        setShowShareModal(true);
    };

    const handleUserShareToggle = (username: string) => {
        setSelectedShareUsers(prev =>
            prev.includes(username)
                ? prev.filter(user => user !== username)
                : [...prev, username]
        );
    };

    const handleConfirmShare = async () => {
        if (selectedShareUsers.length === 0) {
            alert('กรุณาเลือกผู้ใช้ที่ต้องการแชร์');
            return;
        }

        setIsSharing(true);
        try {
            await shareCards(selectedCards, selectedShareUsers);
            alert(`แชร์การ์ด ${selectedCards.length} ใบให้ ${selectedShareUsers.length} คนเรียบร้อยแล้ว`);
            setShowShareModal(false);
            setSelectedCards([]);
            setSelectedShareUsers([]);
            setIsShareMode(false);
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการแชร์การ์ด');
        } finally {
            setIsSharing(false);
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
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Contacts</h1>
                <div className="flex gap-2">
                    {isShareMode && (
                        <button
                            onClick={handleOpenShareModal}
                            disabled={selectedCards.length === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            แชร์ ({selectedCards.length})
                        </button>
                    )}
                    <button
                        onClick={handleShareModeToggle}
                        className={`px-4 py-2 rounded-lg font-medium ${
                            isShareMode 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        {isShareMode ? 'ยกเลิก' : 'แชร์การ์ด'}
                    </button>
                </div>
            </div>
            
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
                        <div key={card.id} className="relative">
                            {isShareMode && card.createdBy === currentUser && (
                                <div className="absolute top-2 left-2 z-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedCards.includes(card.id!)}
                                        onChange={() => handleCardSelect(card.id!)}
                                        className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </div>
                            )}
                            <CardItem
                                card={card}
                                onEdit={() => !isShareMode && setEditingCard(card)}
                                onDelete={() => !isShareMode && setDeletingCard(card)}
                                isShareMode={isShareMode}
                                canEdit={card.createdBy === currentUser}
                            />
                        </div>
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

            {showShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">
                            แชร์การ์ด ({selectedCards.length} ใบ)
                        </h3>
                        
                        <div className="mb-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                เลือกผู้ใช้ที่ต้องการแชร์:
                            </p>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {allUsers.map(user => (
                                    <label key={user} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedShareUsers.includes(user)}
                                            onChange={() => handleUserShareToggle(user)}
                                            className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-slate-700 dark:text-slate-300">{user}</span>
                                    </label>
                                ))}
                            </div>
                            {allUsers.length === 0 && (
                                <p className="text-slate-500 text-sm">ไม่มีผู้ใช้อื่นในระบบ</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowShareModal(false);
                                    setSelectedShareUsers([]);
                                }}
                                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirmShare}
                                disabled={isSharing || selectedShareUsers.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSharing && <Spinner />}
                                {isSharing ? 'กำลังแชร์...' : 'แชร์'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardList;