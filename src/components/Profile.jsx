import React from 'react'
import ProfileEdit from './ProfileEdit'
import { useSelector } from 'react-redux'

const Profile = () => {
  const user= useSelector(store=> store.user)
  return user && (
    <div className='flex gap-10 justify-center pt-13'>
      <ProfileEdit user={user}/>
    </div>
  )
}

export default Profile