import React from "react";

type SkeletonProps = {
  className?: string;
};

export const Skeleton = ({ className = "" }: SkeletonProps) => (
  <div className={`skeleton rounded-xl ${className}`}></div>
);