import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  variant?: 'body1' | 'body2' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  component?: React.ElementType;
}

/**
 * TypewriterText component displays text with a typewriter effect
 */
const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 30,
  onComplete,
  variant = 'body1',
  component = 'div'
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<number>();

  // Reset when text changes
  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  // Typewriter effect
  useEffect(() => {
    if (currentIndex < text.length) {
      timeoutRef.current = window.setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
    } else if (onComplete && currentIndex === text.length) {
      onComplete();
    }

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex, text, speed, onComplete]);

  return (
    <Box>
      <Typography variant={variant} component={component}>
        {displayText}
      </Typography>
    </Box>
  );
};

export default TypewriterText; 