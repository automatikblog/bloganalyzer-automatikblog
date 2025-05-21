
import React from 'react';
import { Star } from 'lucide-react';

interface RatingProps {
  score: number;
  total?: number;
}

const Rating = ({ score, total = 5 }: RatingProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[...Array(total)].map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i < Math.floor(score)
                ? 'text-yellow-400 fill-yellow-400'
                : i < score
                ? 'text-yellow-400 fill-yellow-400 opacity-50'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      <span className="text-gray-700 font-medium">
        {score} de {total}
      </span>
    </div>
  );
};

export default Rating;
