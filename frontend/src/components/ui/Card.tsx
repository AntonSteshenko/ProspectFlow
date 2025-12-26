import { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className, ...props }: CardProps) => {
  return (
    <div className={clsx('bg-white rounded-lg shadow-md p-6', className)} {...props}>
      {children}
    </div>
  );
};
