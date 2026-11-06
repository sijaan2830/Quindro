/*--------------------------------------------------------------------------------------
 *  Copyright 2026 Quindro IDE Technologies. All rights reserved.
 *--------------------------------------------------------------------------------------*/

import React from 'react';

interface QuindroLogoProps {
	size?: number;
	className?: string;
	glow?: boolean;
}

export const QuindroLogo: React.FC<QuindroLogoProps> = ({
	size = 24,
	className = '',
	glow = true,
}) => {
	const id = React.useId();
	const gradOuterId = `q_outer_${id}`;
	const glowId = `q_glow_${id}`;

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 128 128"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={`inline-block shrink-0 ${className}`}
		>
			<defs>
				<linearGradient id={gradOuterId} x1="16" y1="16" x2="112" y2="112" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor="#38BDF8" />
					<stop offset="50%" stopColor="#818CF8" />
					<stop offset="100%" stopColor="#C084FC" />
				</linearGradient>
				{glow && (
					<filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
						<feGaussianBlur stdDeviation="8" result="blur" />
						<feComposite in="SourceGraphic" in2="blur" operator="over" />
					</filter>
				)}
			</defs>

			{glow && (
				<circle
					cx="64"
					cy="64"
					r="44"
					fill={`url(#${gradOuterId})`}
					opacity="0.25"
					filter={`url(#${glowId})`}
				/>
			)}

			{/* Outer Quantum Squircle */}
			<rect
				x="22"
				y="22"
				width="84"
				height="84"
				rx="26"
				stroke={`url(#${gradOuterId})`}
				strokeWidth="6.5"
				strokeLinecap="round"
			/>

			{/* Inner Concentric Aperture */}
			<circle
				cx="64"
				cy="64"
				r="24"
				stroke="rgba(255, 255, 255, 0.9)"
				strokeWidth="4.5"
				strokeDasharray="110 18"
			/>

			{/* The 'Q' Quantum Beam */}
			<path
				d="M78 78L106 106"
				stroke={`url(#${gradOuterId})`}
				strokeWidth="8"
				strokeLinecap="round"
			/>
			<circle cx="106" cy="106" r="4.5" fill="#38BDF8" />

			{/* Center Core Singularity */}
			<circle cx="64" cy="64" r="6.5" fill={`url(#${gradOuterId})`} />
			<circle cx="64" cy="64" r="2.5" fill="#FFFFFF" />
		</svg>
	);
};
