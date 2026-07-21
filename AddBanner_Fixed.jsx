import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Switch, FormControlLabel } from '@mui/material';
import { useSnackbar } from 'notistack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const AddBanner = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        link: '',
        isActive: true,
    });
    
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('link', formData.link);
        data.append('isActive', formData.isActive);
        if (image) {
            data.append('media', image);
        }

        try {
            const response = await fetch('http://localhost:4000/api/v1/admin/banner/new', {
                method: 'POST',
                body: data,
                credentials: 'include'
            });

            if (response.ok) {
                enqueueSnackbar('Banner added successfully', { variant: 'success' });
                navigate('/admin/banner');
            } else {
                enqueueSnackbar('Failed to add banner', { variant: 'error' });
            }
        } catch (error) {
            enqueueSnackbar('Error adding banner', { variant: 'error' });
        }
    };

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/admin/banner')}
                className="mb-4"
            >
                Back to Banners
            </Button>

            <div className="bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold mb-6">Add New Banner</h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <TextField
                        label="Title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        fullWidth
                    />

                    <TextField
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        multiline
                        rows={3}
                        fullWidth
                    />

                    <TextField
                        label="Link URL"
                        name="link"
                        value={formData.link}
                        onChange={handleChange}
                        fullWidth
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            />
                        }
                        label="Active"
                    />

                    <div>
                        <label className="block mb-2 font-medium">Banner Image/Video</label>
                        <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {imagePreview && (
                            <img src={imagePreview} alt="Preview" className="mt-4 w-full h-48 object-cover rounded" />
                        )}
                    </div>

                    <div className="flex gap-2 mt-4">
                        <Button type="submit" variant="contained" color="primary">
                            Add Banner
                        </Button>
                        <Button variant="outlined" onClick={() => navigate('/admin/banner')}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddBanner;
