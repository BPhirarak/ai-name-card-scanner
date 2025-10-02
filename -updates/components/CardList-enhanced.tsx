import React, { useState, useEffect } from 'react';
import { listenForCards, deleteCard } from '../services/contactService';
import CardItem from './CardItem';
import CardDetailModal from './CardDetailModal';
import type { BusinessCard } from '../types';

const CardList: React.FC = () => {
    const [cards, setCards] = useState<BusinessCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        console.log('📋 Setting up CardList...');
        const unsubscribe = listenForCards((updatedCards) => {
            console.log('📋 Cards received in CardList:', updatedCards.length);
            setCards(updatedCards);
            setLoading(false);
        });

        return () => {
            console.log('🔇 Cleaning up CardList listener');
            unsubscribe();
        };
    }, []);

    const handleCardClick = (card: BusinessCard) => {
        console.log('👆 Card clicked:', card.id);
        setSelectedCard(card);
        setShowDetailModal(true);
    };

    const handleEditCard = (card: BusinessCard) => {
        console.log('✏️ Edit card:', card.id);
        setSelectedCard(card);
        setShowDetailModal(true);
    };

    const handleDeleteCard = async (cardId: string) => {
        if (window.confirm('Are you sure you want to delete this business card?')) {
            try {
                console.log('🗑️ Deleting card:', cardId);
                await deleteCard(cardId);
                console.log('✅ Card deleted successfully');
            } catch (error) {
                console.error('❌ Failed to delete card:', error);
                alert('Failed to delete card. Please try again.');
            }
        }
    };

    const handleSaveCard = (updatedCard: BusinessCard) => {
        console.log('💾 Card saved:', updatedCard.id);
        // The card will be automatically updated through the listener
        setShowDetailModal(false);
        setSelectedCard(null);
    };

    const handleCloseModal = () => {
        setShowDetailModal(false);
        setSelectedCard(null);
    };

    // Filter cards based on search term and category
    const filteredCards = cards.filter(card => {
        const matchesSearch = searchTerm === '' || 
            card.name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = selectedCategory === 'All' || card.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    // Get unique categories for filter
    const categories = ['All', ...Array.from(new Set(cards.map(card => card.category)))];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Loading business cards...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    Business Cards ({filteredCards.length})
                </h1>
                
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search cards..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:w-64"
                    />
                    
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">💡 How to use:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>👆 <strong>Click on any card</strong> to view and edit details</li>
                    <li>🔍 <strong>Click on card image</strong> to view full-size image</li>
                    <li>✏️ <strong>Use Edit button</strong> for quick access to edit mode</li>
                    <li>🗑️ <strong>Use Delete button</strong> to remove cards</li>
                    <li>🔍 <strong>Use search</strong> to find specific cards</li>
                    <li>📂 <strong>Filter by category</strong> to organize your cards</li>
                </ul>
            </div>

            {/* Cards Grid */}
            {filteredCards.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
                        {searchTerm || selectedCategory !== 'All' ? 'No matching cards found' : 'No business cards yet'}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        {searchTerm || selectedCategory !== 'All' 
                            ? 'Try adjusting your search or filter criteria'
                            : 'Start by adding your first business card using the scanner'
                        }
                    </p>
                    {(searchTerm || selectedCategory !== 'All') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('All');
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCards.map((card) => (
                        <div
                            key={card.id}
                            onClick={() => handleCardClick(card)}
                            className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
                        >
                            <CardItem
                                card={card}
                                onEdit={(card) => {
                                    // Prevent event bubbling
                                    event?.stopPropagation();
                                    handleEditCard(card);
                                }}
                                onDelete={(cardId) => {
                                    // Prevent event bubbling
                                    event?.stopPropagation();
                                    handleDeleteCard(cardId);
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Card Detail Modal */}
            <CardDetailModal
                isOpen={showDetailModal}
                card={selectedCard}
                onClose={handleCloseModal}
                onSave={handleSaveCard}
            />
        </div>
    );
};

export default CardList;