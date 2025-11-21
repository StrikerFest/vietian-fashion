// components/StarRating.js
export default function StarRating({ rating }) {
    const totalStars = 5;
    let stars = [];
    for (let i = 1; i <= totalStars; i++) {
        stars.push(
            <span key={i} className={`text-lg ${i <= rating ? 'text-yellow-400' : 'text-gray-600'}`}>
                ★
            </span>
        );
    }
    return <div className="flex">{stars}</div>;
}