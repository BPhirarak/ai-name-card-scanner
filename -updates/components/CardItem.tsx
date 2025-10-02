import React, { useState } from 'react';
import type { BusinessCard } from '../types';

interface CardItemProps {
    card: BusinessCard;
    onEdit: (card: BusinessCard) => void;
    onDelete: (id: string) => void;
}

const CardItem: React.FC<CardItemProps> = ({ card, onEdit, onDelete }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    const handleImageLoad = () => {
        setImageLoading(false);
        setImageError(false);
    };

    const handleImageError = () => {
        setImageLoading(false);
        setImageError(true);
        console.warn('Failed to load image:', card.imageUrl);
    };

    const displayName = card.name_en || card.name_th || 'Unknown Name';

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex gap-4">
                {/* Image Section */}
                <div className="flex-shrink-0">
                    {card.imageUrl && !imageError ? (
                        <div className="relative w-24 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                            {imageLoading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-xs text-slate-500">Loading...</div>
                                </div>
                            )}
                            <img
                                src={card.imageUrl}
                                alt={`Business card for ${displayName}`}
                                className={`w-full h-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                                onLoad={handleImageLoad}
                                onError={handleImageError}
                            />
                        </div>
                    ) : (
                        <div className="w-24 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                            <div className="text-center text-slate-500 dark:text-slate-400">
                                <div className="text-lg">📄</div>
                                <div className="text-xs">No Image</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {displayName}
                        </h3>
                        <div className="flex gap-2 ml-2">
                            <button
                                onClick={() => onEdit(card)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => onDelete(card.id!)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        {card.company && (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">🏢</span>
                                <span className="truncate">{card.company}</span>
                            </div>
                        )}
                        
                        {card.title && (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">💼</span>
                                <span className="truncate">{card.title}</span>
                            </div>
                        )}
                        
                        {card.email && (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">📧</span>
                                <span className="truncate">{card.email}</span>
                            </div>
                        )}
                        
                        {card.phone_mobile && (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">📱</span>
                                <span className="truncate">{card.phone_mobile}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                            <span>📂</span>
                            {card.category}
                        </span>
                        <span className="flex items-center gap-1">
                            {card.imageUrl ? (
                                <>
                                    <span>📸</span>
                                    Has Image
                                </>
                            ) : (
                                <>
                                    <span>📄</span>
                                    No Image
                                </>
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CardItem;