import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Shell } from './layout/Shell'
import { MatterHome } from './pages/MatterHome'
import { GuidePage } from './pages/GuidePage'
import { NotesPage } from './pages/NotesPage'
import { FactsPage } from './pages/FactsPage'
import { LibraryPage } from './pages/LibraryPage'
import { ArgumentsPage } from './pages/ArgumentsPage'
import { OpeningsPage, UploadPage } from './pages/WorkspaceExtras'
import { AgentPage } from './pages/AgentPage'

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<MatterHome />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/facts" element={<FactsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/arguments" element={<ArgumentsPage />} />
          <Route path="/openings" element={<OpeningsPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/agent" element={<AgentPage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
