"use client"
import React, { useState, useEffect } from 'react';
import Image from 'next/image'; 

import image1 from "../../../../public/images/berap-images/1.jpg"
import image2 from "../../../../public/images/berap-images/2.jpg"
import image3 from "../../../../public/images/berap-images/3.jpg"
import image4 from "../../../../public/images/berap-images/4.jpg"
import image5 from "../../../../public/images/berap-images/5.jpg"
import image6 from "../../../../public/images/berap-images/6.jpg"
import image7 from "../../../../public/images/berap-images/7.jpg"
import image8 from "../../../../public/images/berap-images/8.jpg"
import image9 from "../../../../public/images/berap-images/9.jpg"
import image10 from "../../../../public/images/berap-images/10.jpg"
import image11 from "../../../../public/images/berap-images/11.jpg"
import image12 from "../../../../public/images/berap-images/12.jpg"

const images = [
    { id: 1, image: image1 },
    { id: 2, image: image2 },
    { id: 3, image: image3 },
    { id: 4, image: image4 },
    { id: 5, image: image5 },
    { id: 6, image: image6 },
    { id: 7, image: image7 },
    { id: 8, image: image8 },
    { id: 9, image: image9 },
    { id: 10, image: image10 },
    { id: 11, image: image11 },
    { id: 12, image: image12 },
];

const Berap = () => {
   
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const goToNext = () => {
        setCurrentImageIndex((prevIndex) => 
            (prevIndex === images.length - 1) ? 0 : prevIndex + 1
        );
    };

    // Function to handle moving to the previous image
    const goToPrevious = () => {
        setCurrentImageIndex((prevIndex) => 
            (prevIndex === 0) ? images.length - 1 : prevIndex - 1
        );
    };

    // Auto-advance the carousel every 5 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            goToNext();
        }, 5000); // Change image every 5 seconds

        // Cleanup the interval on component unmount
        return () => clearInterval(timer);
    }, [currentImageIndex]);

    return (
        <div className="flex justify-center items-center bg-gray-100 dark:bg-gray-900 font-sans p-4 ">
            <div className="relative w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden group aspect-video">
                
                {/* Carousel Image - Now using the next/image component */}
                <Image
                    src={images[currentImageIndex].image}
                    alt={`Carousel image ${images[currentImageIndex].id}`}
                    layout="fill"
                    objectFit="contain"
                    priority={currentImageIndex === 0}
                />

                {/* Navigation Buttons */}
                <button
                type="button"
                    onClick={goToPrevious}
                    className="absolute top-1/2 left-4 -translate-y-1/2 p-3 bg-white/50 dark:bg-gray-900/50 text-gray-800 dark:text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-x-full group-hover:translate-x-0 focus:outline-none focus:ring-2 focus:ring-green-500 z-10"
                    aria-label="Previous image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                type="button"
                    onClick={goToNext}
                    className="absolute top-1/2 right-4 -translate-y-1/2 p-3 bg-white/50 dark:bg-gray-900/50 text-gray-800 dark:text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-full group-hover:translate-x-0 focus:outline-none focus:ring-2 focus:ring-green-500 z-10"
                    aria-label="Next image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* Indicator Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                    {images.map((_, index) => (
                        <button
                        type="button"
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`h-3 w-3 rounded-full transition-all duration-300 ease-in-out ${
                                index === currentImageIndex ? 'bg-green-500 w-8' : 'bg-gray-300 dark:bg-gray-600'
                            } focus:outline-none focus:ring-2 focus:ring-green-500`}
                            aria-label={`Go to image ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Berap;
