import { Route, Routes, useNavigate } from "react-router-dom"
import { NotFoundProps } from "@/interfaces"
import { PublicRoutes } from "@/models"

function RoutesWithNotFound({ children }: NotFoundProps) {
    const navigate  = useNavigate()
    return (
        <Routes>

            {children}
            <Route path="*" element={
                <><div className="text-7xl text-blue-950 text-center">Not Found</div>
                <div className="text-3xl text-blue-950 text-center">
                <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full' onClick={() => navigate(`/${PublicRoutes.LOGIN}`)}>Login</button>

                </div>
                </>

                } />

        </Routes>
    )

}
export default RoutesWithNotFound
