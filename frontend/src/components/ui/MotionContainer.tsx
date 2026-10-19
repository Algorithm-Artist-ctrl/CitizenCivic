import React from 'react';
import { motion } from 'motion/react';

interface MotionContainerProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const MotionContainer: React.FC<MotionContainerProps> = ({
  children,
  delay = 0,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.35,
        delay,
        ease: [0.16, 1, 0.3, 1], // Custom refined curve
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const MotionStagger: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const MotionItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default MotionContainer;
