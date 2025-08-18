import React from 'react'
import { createRoot } from 'react-dom/client'
import { PlaygroundApp } from './playground-app'

const root = createRoot(document.getElementById('root')!)
root.render(<PlaygroundApp />)


