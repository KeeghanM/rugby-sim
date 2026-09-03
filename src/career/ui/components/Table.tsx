import type React from 'react'
import { type Career, deriveStandings } from '../../domain/index.ts'

export interface TableProps {
  career: Career
  limit?: number
}

export const Table: React.FC<TableProps> = ({ career, limit }) => {
  const standings = deriveStandings(career)
  const rows = limit !== undefined ? standings.slice(0, limit) : standings

  return (
    <div className="career-table-wrap">
      <table className="career-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Club</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>Diff</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isManaged = row.clubId === career.managedClubId
            return (
              <tr key={row.clubId} className={isManaged ? 'managed' : ''}>
                <td>{index + 1}</td>
                <td>{row.clubName}</td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>
                  {row.pointsDifference > 0 ? '+' : ''}
                  {row.pointsDifference}
                </td>
                <td>
                  <strong>{row.tablePoints}</strong>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
